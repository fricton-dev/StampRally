import json
import logging
import re
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from config import settings
from database.database import DatabaseService, get_db_service
from routers.auth import UserResponse, get_current_user
from services.security import create_access_token, get_password_hash


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])

_UTC_OFFSET_PATTERN = re.compile(r"^UTC([+-])(?:(\d{1,2})(?::([0-5]\d))?)$")
_RULE_COUPON_PATTERN = re.compile(r"^tenant-[^-]+-rule-(\d+)$")
ALLOWED_LANGUAGES = {"ja", "en", "zh"}


def _tzinfo_from_offset(value: Optional[str]) -> Optional[datetime.tzinfo]:
    if not value:
        return None
    text = value.strip()
    if not text:
        return None
    match = _UTC_OFFSET_PATTERN.fullmatch(text)
    if not match:
        return None
    sign, hours_text, minutes_text = match.groups()
    hours = int(hours_text)
    minutes = int(minutes_text or "00")
    if hours > 14 or (hours == 14 and minutes != 0):
        return None
    offset = timedelta(hours=hours, minutes=minutes)
    if sign == "-":
        offset = -offset
    return timezone(offset)


def _normalize_language(value: Optional[str]) -> str:
    if not value:
        return "ja"
    code = value.strip().lower()
    return code if code in ALLOWED_LANGUAGES else "ja"


def _extract_threshold_from_coupon_id(coupon_id: str) -> Optional[int]:
    match = _RULE_COUPON_PATTERN.match(coupon_id)
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None


def _coupon_description_for_threshold(threshold: int, language: str) -> str:
    if language == "en":
        return f"Coupon unlocked at {threshold} stamps"
    if language == "zh":
        return f"集滿 {threshold} 個印章獲得的優惠券"
    return f"{threshold}個達成で獲得したクーポン"


class UserCreate(BaseModel):
    tenant_id: str
    username: str
    email: EmailStr
    password: str
    gender: str = Field(..., min_length=1, max_length=20)
    age: int = Field(..., ge=0, le=120)
    role: Optional[str] = "user"


class CouponModel(BaseModel):
    id: str
    tenantId: str
    title: str
    description: Optional[str] = None
    used: bool
    icon: Optional[str] = None


class ProgressResponse(BaseModel):
    tenantId: str
    stamps: int
    coupons: List[CouponModel]
    stampedStoreIds: List[str] = []


class StampRequest(BaseModel):
    store_id: str


class StoreSummary(BaseModel):
    id: str
    tenantId: str
    name: str
    hasStamped: bool = True


class StampResponse(BaseModel):
    status: Literal["stamped", "already_stamped", "store-not-found"]
    store: Optional[StoreSummary]
    stamps: int
    new_coupons: List[CouponModel]
    stampedStoreIds: List[str] = []


def _resolve_campaign_timezone() -> datetime.tzinfo:
    tz_value = getattr(settings, "DEFAULT_TIMEZONE", None)
    offset_tz = _tzinfo_from_offset(tz_value)
    if offset_tz:
        return offset_tz
    if tz_value:
        try:
            return ZoneInfo(tz_value)
        except Exception:
            logger.warning("Invalid DEFAULT_TIMEZONE '%s'. Falling back to system timezone.", tz_value)
    try:
        local_tz = datetime.now().astimezone().tzinfo
        if local_tz:
            return local_tz
    except Exception:
        pass
    return timezone.utc


CAMPAIGN_TZ = _resolve_campaign_timezone()
ALLOWED_COUPON_USAGE_MODES = {"campaign", "custom"}


def _normalize_iso_datetime(value: str) -> str:
    if value.endswith("Z"):
        return value[:-1] + "+00:00"
    return value


def _parse_campaign_boundary(value: Optional[str], *, end: bool, tz: datetime.tzinfo) -> Optional[datetime]:
    if not value:
        return None
    text = value.strip()
    if not text:
        return None
    try:
        normalized = _normalize_iso_datetime(text)
        if "T" in normalized or "+" in normalized:
            dt = datetime.fromisoformat(normalized)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=tz)
            else:
                dt = dt.astimezone(tz)
        else:
            campaign_date = date.fromisoformat(normalized)
            dt = datetime.combine(campaign_date, time.max if end else time.min, tzinfo=tz)
        return dt
    except ValueError:
        return None


def _load_tenant_config_data(db: DatabaseService, tenant_id: str) -> Dict[str, Any]:
    rows = db.execute_query(
        "SELECT config FROM tenants WHERE tenant_id = %s",
        (tenant_id,),
    )
    if not rows:
        return {}
    raw_config = rows[0].get("config") or {}
    if isinstance(raw_config, str):
        try:
            return json.loads(raw_config)
        except json.JSONDecodeError:
            logger.warning("Invalid tenant config JSON for %s", tenant_id)
            return {}
    return raw_config or {}


def _resolve_timezone_from_config(config_data: Dict[str, Any]) -> datetime.tzinfo:
    tz_value = (
        config_data.get("campaignTimezone")
        or config_data.get("campaign_timezone")
        or getattr(settings, "DEFAULT_TIMEZONE", None)
    )
    offset_tz = _tzinfo_from_offset(tz_value)
    if offset_tz:
        return offset_tz
    if tz_value:
        try:
            return ZoneInfo(tz_value)
        except Exception:
            logger.warning("Invalid campaign timezone '%s'. Falling back to default.", tz_value)
    return CAMPAIGN_TZ


def _resolve_coupon_usage_window(
    config_data: Dict[str, Any],
    tz: datetime.tzinfo,
) -> tuple[str, Optional[datetime], Optional[datetime]]:
    mode = (config_data.get("couponUsageMode") or "campaign").lower()
    if mode not in ALLOWED_COUPON_USAGE_MODES:
        mode = "campaign"

    if mode == "custom":
        start_value = config_data.get("couponUsageStart") or config_data.get("coupon_usage_start")
        end_value = config_data.get("couponUsageEnd") or config_data.get("coupon_usage_end")
    else:
        start_value = config_data.get("campaignStart") or config_data.get("campaign_start")
        end_value = config_data.get("campaignEnd") or config_data.get("campaign_end")

    start_dt = _parse_campaign_boundary(start_value, end=False, tz=tz)
    end_dt = _parse_campaign_boundary(end_value, end=True, tz=tz)
    return mode, start_dt, end_dt


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


def _ensure_user_progress(db: DatabaseService, user_id: int, tenant_id: str) -> None:
    db.execute_query(
        """
        INSERT INTO user_progress (user_id, tenant_id, stamps)
        VALUES (%s, %s, 0)
        ON CONFLICT (user_id) DO NOTHING
        """,
        (user_id, tenant_id),
    )


def _load_user_progress(
    db: DatabaseService, user_id: int, tenant_id: str
) -> ProgressResponse:
    progress_rows = db.execute_query(
        """
        SELECT tenant_id, stamps
        FROM user_progress
        WHERE user_id = %s
        """,
        (user_id,),
    )
    if progress_rows:
        stamps = progress_rows[0]["stamps"]
        tenant = progress_rows[0]["tenant_id"]
    else:
        stamps = 0
        tenant = tenant_id

    config_data = _load_tenant_config_data(db, tenant)
    language = _normalize_language(config_data.get("language"))

    coupon_rows = db.execute_query(
        """
        SELECT coupon_id, tenant_id, title, description, used
        FROM user_coupons
        WHERE user_id = %s
        ORDER BY created_at, id
        """,
        (user_id,),
    )
    # Build a lookup for reward-rule icons by threshold
    rule_rows = db.execute_query(
        """
        SELECT threshold, icon
        FROM reward_rules
        WHERE tenant_id = %s
        """,
        (tenant,),
    )
    icon_map: Dict[int, Optional[str]] = {}
    for row in rule_rows:
        threshold = row.get("threshold")
        if threshold is None:
            continue
        try:
            icon_map[int(threshold)] = row.get("icon")
        except (TypeError, ValueError):
            continue

    coupons: List[CouponModel] = []
    for row in coupon_rows:
        coupon_id = row["coupon_id"]
        threshold = _extract_threshold_from_coupon_id(coupon_id)
        description = row.get("description")
        icon = None
        if threshold is not None:
            description = _coupon_description_for_threshold(threshold, language)
            icon = icon_map.get(threshold)
        coupons.append(
            CouponModel(
                id=coupon_id,
                tenantId=row["tenant_id"],
                title=row["title"],
                description=description,
                used=row.get("used", False),
                icon=icon,
            )
        )

    stamp_rows = db.execute_query(
        """
        SELECT store_id
        FROM user_store_stamps
        WHERE user_id = %s
        """,
        (user_id,),
    )
    stamped_store_ids = [row["store_id"] for row in stamp_rows]

    return ProgressResponse(
        tenantId=tenant,
        stamps=stamps,
        coupons=coupons,
        stampedStoreIds=stamped_store_ids,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserCreate,
    db: DatabaseService = Depends(get_db_service),
) -> AuthResponse:
    tenant_check = db.execute_query(
        """
        SELECT tenant_id
        FROM tenants
        WHERE tenant_id = %s AND is_active = TRUE
        """,
        (payload.tenant_id,),
    )
    if not tenant_check:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    duplicate_check = db.execute_query(
        """
        SELECT id
        FROM users
        WHERE tenant_id = %s
          AND (username = %s OR email = %s)
        """,
        (payload.tenant_id, payload.username, payload.email),
    )
    if duplicate_check:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already registered",
        )

    password_hash = get_password_hash(payload.password)
    created_rows = db.execute_query(
        """
        INSERT INTO users (
            tenant_id,
            username,
            email,
            password_hash,
            role,
            gender,
            age,
            is_active
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
        RETURNING id, tenant_id, username, email, role, gender, age, is_active
        """,
        (
            payload.tenant_id,
            payload.username,
            payload.email,
            password_hash,
            payload.role or "user",
            payload.gender,
            payload.age,
        ),
    )

    if not created_rows:
        raise HTTPException(status_code=500, detail="Failed to create user")

    user_row = created_rows[0]
    user_response = UserResponse(
        id=user_row["id"],
        username=user_row["username"],
        email=user_row["email"],
        role=user_row.get("role", "user"),
        tenant_id=user_row["tenant_id"],
        gender=user_row.get("gender"),
        age=user_row.get("age"),
    )

    _ensure_user_progress(db, user_row["id"], user_row["tenant_id"])

    access_token = create_access_token(
        {
            "sub": user_row["username"],
            "tenant_id": user_row["tenant_id"],
            "role": user_row.get("role", "user"),
        }
    )

    return AuthResponse(
        user=user_response,
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> UserResponse:
    """Return basic profile details for the authenticated user."""
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user.get("email", ""),
        role=current_user.get("role", ""),
        tenant_id=current_user.get("tenant_id", ""),
        gender=current_user.get("gender"),
        age=current_user.get("age"),
    )


@router.get("/me/progress", response_model=ProgressResponse)
async def read_user_progress(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service),
) -> ProgressResponse:
    """Fetch cumulative stamp and coupon progress for the current user."""
    _ensure_user_progress(db, current_user["id"], current_user["tenant_id"])
    return _load_user_progress(db, current_user["id"], current_user["tenant_id"])


@router.post("/me/stamps", response_model=StampResponse)
async def record_stamp(
    payload: StampRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service),
) -> StampResponse:
    store_id = payload.store_id.strip()
    if not store_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid store id")

    cursor = db.cursor
    if cursor is None:
        raise HTTPException(status_code=500, detail="Database cursor unavailable")

    user_id = current_user["id"]
    tenant_id = current_user["tenant_id"]

    try:
        cursor.execute(
            """
            SELECT store_id, name
            FROM stores
            WHERE tenant_id = %s AND store_id = %s
            """,
            (tenant_id, store_id),
        )
        store_row = cursor.fetchone()
        if store_row is None:
            cursor.execute(
                "SELECT stamps FROM user_progress WHERE user_id = %s",
                (user_id,),
            )
            stamps_row = cursor.fetchone()
            stamps = stamps_row[0] if stamps_row else 0
            db.connection.commit()
            return StampResponse(
                status="store-not-found",
                store=None,
                stamps=stamps,
                new_coupons=[],
                stampedStoreIds=[],
            )

        store_summary = StoreSummary(
            id=store_row[0],
            tenantId=tenant_id,
            name=store_row[1],
            hasStamped=True,
        )

        cursor.execute(
            """
            SELECT config
            FROM tenants
            WHERE tenant_id = %s
            """,
            (tenant_id,),
        )
        campaign_row = cursor.fetchone()
        language = "ja"
        if campaign_row:
            raw_config = campaign_row[0]
            if isinstance(raw_config, str):
                try:
                    config_data = json.loads(raw_config)
                except json.JSONDecodeError:
                    config_data = {}
            else:
                config_data = raw_config or {}

            start_value = config_data.get("campaignStart") or config_data.get("campaign_start")
            end_value = config_data.get("campaignEnd") or config_data.get("campaign_end")
            tz_value = (
                config_data.get("campaignTimezone")
                or config_data.get("campaign_timezone")
                or getattr(settings, "DEFAULT_TIMEZONE", None)
            )
            language = _normalize_language(config_data.get("language"))
            campaign_tz = _tzinfo_from_offset(tz_value) or CAMPAIGN_TZ
            if campaign_tz is CAMPAIGN_TZ and tz_value:
                try:
                    campaign_tz = ZoneInfo(tz_value)
                except Exception:
                    logger.warning("Unsupported campaign timezone '%s' for tenant %s", tz_value, tenant_id)

            start_dt = _parse_campaign_boundary(start_value, end=False, tz=campaign_tz)
            end_dt = _parse_campaign_boundary(end_value, end=True, tz=campaign_tz)
            now = datetime.now(campaign_tz)

            if start_dt and now < start_dt:
                if db.connection:
                    db.connection.rollback()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="キャンペーン開始前のためスタンプを押せません。",
                )
            if end_dt and now > end_dt:
                if db.connection:
                    db.connection.rollback()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="キャンペーン終了後のためスタンプを押せません。",
                )

        cursor.execute(
            """
            INSERT INTO user_progress (user_id, tenant_id, stamps)
            VALUES (%s, %s, 0)
            ON CONFLICT (user_id) DO NOTHING
            """,
            (user_id, tenant_id),
        )

        cursor.execute(
            """
            SELECT 1
            FROM user_store_stamps
            WHERE user_id = %s AND store_id = %s
            """,
            (user_id, store_id),
        )
        if cursor.fetchone():
            cursor.execute(
                "SELECT stamps FROM user_progress WHERE user_id = %s",
                (user_id,),
            )
            existing_stamps = cursor.fetchone()
            stamps_value = existing_stamps[0] if existing_stamps else 0
            cursor.execute(
                """
                SELECT store_id
                FROM user_store_stamps
                WHERE user_id = %s
                """,
                (user_id,),
            )
            stamped_ids = [row[0] for row in cursor.fetchall()]
            db.connection.commit()
            return StampResponse(
                status="already_stamped",
                store=store_summary,
                stamps=stamps_value,
                new_coupons=[],
                stampedStoreIds=stamped_ids,
            )

        cursor.execute(
            """
            INSERT INTO user_store_stamps (user_id, tenant_id, store_id)
            VALUES (%s, %s, %s)
            """,
            (user_id, tenant_id, store_id),
        )

        cursor.execute(
            """
            UPDATE user_progress
            SET stamps = stamps + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            RETURNING stamps
            """,
            (user_id,),
        )
        updated_stamps_row = cursor.fetchone()
        if updated_stamps_row is None:
            cursor.execute(
                """
                INSERT INTO user_progress (user_id, tenant_id, stamps)
                VALUES (%s, %s, 1)
                RETURNING stamps
                """,
                (user_id, tenant_id),
            )
            updated_stamps_row = cursor.fetchone()
        stamps_value = updated_stamps_row[0]

        cursor.execute(
            """
            SELECT coupon_id
            FROM user_coupons
            WHERE user_id = %s
            """,
            (user_id,),
        )
        existing_coupon_ids = {row[0] for row in cursor.fetchall()}

        cursor.execute(
            """
            SELECT threshold, label, icon
            FROM reward_rules
            WHERE tenant_id = %s
            ORDER BY threshold
            """,
            (tenant_id,),
        )
        rule_rows = cursor.fetchall()
        new_coupons: List[CouponModel] = []

        for threshold, label, icon in rule_rows:
            if threshold is None:
                continue
            coupon_identifier = f"tenant-{tenant_id}-rule-{threshold}"
            if threshold <= stamps_value and coupon_identifier not in existing_coupon_ids:
                description = _coupon_description_for_threshold(threshold, language)
                cursor.execute(
                    """
                    INSERT INTO user_coupons (
                        user_id,
                        tenant_id,
                        coupon_id,
                        title,
                        description,
                        used
                    )
                    VALUES (%s, %s, %s, %s, %s, FALSE)
                    RETURNING coupon_id, tenant_id, title, description, used
                    """,
                    (
                        user_id,
                        tenant_id,
                        coupon_identifier,
                        label,
                        description,
                    ),
                )
                coupon_row = cursor.fetchone()
                if coupon_row:
                    new_coupon = CouponModel(
                        id=coupon_row[0],
                        tenantId=coupon_row[1],
                        title=coupon_row[2],
                        description=description,
                        used=coupon_row[4],
                        icon=icon,
                    )
                    new_coupons.append(new_coupon)
                    existing_coupon_ids.add(coupon_identifier)

        cursor.execute(
            """
            SELECT store_id
            FROM user_store_stamps
            WHERE user_id = %s
            """,
            (user_id,),
        )
        stamped_ids = [row[0] for row in cursor.fetchall()]

        db.connection.commit()
        return StampResponse(
            status="stamped",
            store=store_summary,
            stamps=stamps_value,
            new_coupons=new_coupons,
            stampedStoreIds=stamped_ids,
        )
    except HTTPException:
        raise
    except Exception as exc:
        db.connection.rollback()
        logger.error("Failed to record stamp: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to record stamp") from exc


@router.patch("/me/coupons/{coupon_id}/use", response_model=CouponModel)
async def mark_coupon_used(
    coupon_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service),
) -> CouponModel:
    updated = db.execute_query(
        """
        UPDATE user_coupons
        SET used = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = %s AND coupon_id = %s
        RETURNING coupon_id, tenant_id, title, description, used
        """,
        (current_user["id"], coupon_id),
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    row = updated[0]
    config_data = _load_tenant_config_data(db, row["tenant_id"])
    language = _normalize_language(config_data.get("language"))
    threshold = _extract_threshold_from_coupon_id(row["coupon_id"])
    description = row.get("description")
    icon = None
    if threshold is not None:
        description = _coupon_description_for_threshold(threshold, language)
        icon_rows = db.execute_query(
            """
            SELECT icon
            FROM reward_rules
            WHERE tenant_id = %s AND threshold = %s
            """,
            (row["tenant_id"], threshold),
        )
        if icon_rows:
            icon = icon_rows[0].get("icon")
    return CouponModel(
        id=row["coupon_id"],
        tenantId=row["tenant_id"],
        title=row["title"],
        description=description,
        used=row.get("used", True),
        icon=icon,
    )
