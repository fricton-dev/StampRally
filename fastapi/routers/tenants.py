import json
import logging
import re
import secrets
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field

from config import settings
from database.database import DatabaseService, get_db_service
from services.security import create_access_token, get_password_hash, verify_password


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


class TenantLoginRequest(BaseModel):
    tenant_id: str
    password: str
    remember_me: Optional[bool] = False


class TenantLoginResponse(BaseModel):
    tenant_id: str
    company_name: str
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


class TenantPasswordResetRequest(BaseModel):
    tenant_id: str
    current_password: str
    new_password: str


class RewardRuleModel(BaseModel):
    threshold: int
    label: str
    icon: Optional[str] = None


class StoreModel(BaseModel):
    id: str
    tenantId: str
    name: str
    lat: float
    lng: float
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    hasStamped: bool = False
    stampMark: Optional[str] = None


class CouponSeed(BaseModel):
    id: str
    tenantId: str
    title: str
    description: Optional[str] = None
    used: bool = False


class TenantConfigModel(BaseModel):
    id: str
    tenantName: str
    rules: List[RewardRuleModel]
    stampMark: Optional[str] = None
    stampImageUrl: Optional[str] = None
    backgroundImageUrl: Optional[str] = None
    campaignStart: Optional[str] = None
    campaignEnd: Optional[str] = None
    campaignDescription: Optional[str] = None
    campaignTimezone: Optional[str] = None
    couponUsageMode: Optional[str] = None
    couponUsageStart: Optional[str] = None
    couponUsageEnd: Optional[str] = None
    themeColor: Optional[str] = None
    maxStampCount: Optional[int] = None
    language: Optional[str] = None


class TenantProgressSeed(BaseModel):
    tenantId: str
    stamps: int = 0
    coupons: List[CouponSeed] = []


class TenantSeedResponse(BaseModel):
    tenant: TenantConfigModel
    stores: List[StoreModel]
    initialProgress: TenantProgressSeed


class DailyMetricModel(BaseModel):
    date: str
    count: int


class CouponDailyStatsModel(BaseModel):
    couponId: str
    title: str
    description: Optional[str] = None
    acquired: List[DailyMetricModel]
    used: List[DailyMetricModel]
    totalAcquired: int
    totalUsed: int


class TenantDashboardStatsResponse(BaseModel):
    rangeStart: str
    rangeEnd: str
    days: int
    totalUsers: int
    totalStamps: int
    dailyUsers: List[DailyMetricModel]
    dailyStamps: List[DailyMetricModel]
    coupons: List[CouponDailyStatsModel]


class TenantCreateRequest(BaseModel):
    tenant_id: Optional[str] = None
    company_name: str
    business_type: Optional[str] = None
    admin_name: Optional[str] = None
    admin_email: EmailStr
    admin_phone: Optional[str] = None
    initial_password: Optional[str] = None
    background_image_url: Optional[str] = None


class TenantCreateResponse(BaseModel):
    tenant_id: str
    company_name: str
    admin_email: EmailStr
    initial_password: str
    must_change_password: bool = True


class StoreCreateRequest(BaseModel):
    store_id: Optional[str] = None
    name: str
    lat: float
    lng: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    stamp_mark: Optional[str] = None


class RewardRuleUpsertRequest(BaseModel):
    threshold: int
    label: str
    icon: Optional[str] = None


class CampaignUpdateRequest(BaseModel):
    campaign_start: Optional[str] = None
    campaign_end: Optional[str] = None
    campaign_description: Optional[str] = None
    background_image_url: Optional[str] = None
    stamp_image_url: Optional[str] = None
    theme_color: Optional[str] = None
    campaign_timezone: Optional[str] = None
    language: Optional[str] = None
    coupon_usage_mode: Optional[str] = None
    coupon_usage_start: Optional[str] = None
    coupon_usage_end: Optional[str] = None
    max_stamps: Optional[int] = Field(default=None, ge=1, le=200)


bearer_scheme = HTTPBearer(auto_error=False)
ALLOWED_THEME_COLORS = {"orange", "teal", "green", "pink"}
ALLOWED_COUPON_USAGE_MODES = {"campaign", "custom"}
ALLOWED_LANGUAGES = {"ja", "en", "zh"}
_UTC_OFFSET_PATTERN = re.compile(r"^UTC([+-])(?:(\d{1,2})(?::([0-5]\d))?)$")
_UTC_OFFSET_FALLBACK = "UTC+09:00"
DEFAULT_LANGUAGE = "ja"


def _format_offset(delta: timedelta) -> Optional[str]:
    total_seconds = int(delta.total_seconds())
    if total_seconds % 60 != 0:
        return None
    total_minutes = total_seconds // 60
    if total_minutes < -14 * 60 or total_minutes > 14 * 60:
        return None
    sign = "+" if total_minutes >= 0 else "-"
    total_minutes = abs(total_minutes)
    hours, minutes = divmod(total_minutes, 60)
    if hours == 14 and minutes != 0:
        return None
    return f"UTC{sign}{hours:02d}:{minutes:02d}"


def _coerce_timezone_to_offset(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    match = _UTC_OFFSET_PATTERN.fullmatch(text)
    if match:
        sign, hours_text, minutes_text = match.groups()
        hours = int(hours_text)
        minutes = int(minutes_text or "00")
        if hours > 14 or (hours == 14 and minutes != 0):
            return None
        return f"UTC{sign}{hours:02d}:{minutes:02d}"
    try:
        tz = ZoneInfo(text)
    except Exception:
        return None
    offset = datetime.now(tz).utcoffset()
    if offset is None:
        return None
    return _format_offset(offset)


def _resolve_default_campaign_timezone() -> str:
    env_value = getattr(settings, "DEFAULT_TIMEZONE", None)
    normalized = _coerce_timezone_to_offset(env_value)
    return normalized or _UTC_OFFSET_FALLBACK


DEFAULT_CAMPAIGN_TIMEZONE = _resolve_default_campaign_timezone()


def _normalize_campaign_timezone(value: Optional[str]) -> str:
    normalized = _coerce_timezone_to_offset(value)
    return normalized or DEFAULT_CAMPAIGN_TIMEZONE


def _validate_campaign_timezone(value: str) -> str:
    normalized = _coerce_timezone_to_offset(value)
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid campaign timezone. Use format 'UTC±HH:MM' within -12:00 to +14:00.",
        )
    return normalized


def _normalize_language(value: Optional[str]) -> str:
    if not value:
        return DEFAULT_LANGUAGE
    code = value.strip().lower()
    return code if code in ALLOWED_LANGUAGES else DEFAULT_LANGUAGE


def _validate_language(value: str) -> str:
    code = value.strip().lower()
    if not code:
        return DEFAULT_LANGUAGE
    if code not in ALLOWED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid language. Allowed values: {', '.join(sorted(ALLOWED_LANGUAGES))}",
        )
    return code


def get_current_tenant_admin(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if payload.get("role") != "tenant_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return payload


def generate_store_identifier(name: str, fallback: Optional[str] = None) -> str:
    base = fallback or re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not base:
        base = secrets.token_hex(4)
    return base


@router.post("/login", response_model=TenantLoginResponse)
async def tenant_login(
    payload: TenantLoginRequest,
    db: DatabaseService = Depends(get_db_service),
) -> TenantLoginResponse:
    tenant_rows = db.execute_query(
        """
        SELECT tenant_id, company_name, admin_password_hash, admin_password_must_change
        FROM tenants
        WHERE tenant_id = %s AND is_active = TRUE
        """,
        (payload.tenant_id,),
    )
    if not tenant_rows:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    tenant = tenant_rows[0]
    stored_hash = tenant.get("admin_password_hash")

    if not stored_hash or not verify_password(payload.password, stored_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token(
        {"sub": tenant["tenant_id"], "tenant_id": tenant["tenant_id"], "role": "tenant_admin"},
        expires_delta=timedelta(days=1),
    )
    must_change_password = bool(tenant.get("admin_password_must_change", False))

    return TenantLoginResponse(
        tenant_id=tenant["tenant_id"],
        company_name=tenant["company_name"],
        access_token=access_token,
        must_change_password=must_change_password,
    )


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_tenant_password(
    payload: TenantPasswordResetRequest,
    db: DatabaseService = Depends(get_db_service),
):
    tenant_rows = db.execute_query(
        """
        SELECT admin_password_hash
        FROM tenants
        WHERE tenant_id = %s AND is_active = TRUE
        """,
        (payload.tenant_id,),
    )
    if not tenant_rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    stored_hash = tenant_rows[0].get("admin_password_hash")
    if not stored_hash or not verify_password(payload.current_password, stored_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    new_hash = get_password_hash(payload.new_password)
    db.execute_query(
        """
        UPDATE tenants
        SET
            admin_password_hash = %s,
            admin_password_must_change = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = %s
        """,
        (new_hash, payload.tenant_id),
    )


@router.get("/{tenant_id}", response_model=TenantSeedResponse)
async def fetch_tenant_seed(
    tenant_id: str,
    db: DatabaseService = Depends(get_db_service),
) -> TenantSeedResponse:
    tenant_rows = db.execute_query(
        """
        SELECT tenant_id, company_name, config
        FROM tenants
        WHERE tenant_id = %s AND is_active = TRUE
        """,
        (tenant_id,),
    )
    if not tenant_rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    tenant = tenant_rows[0]
    raw_config = tenant.get("config") or {}
    if isinstance(raw_config, str):
        try:
            config = json.loads(raw_config)
        except json.JSONDecodeError:
            logger.warning("Invalid config JSON for tenant %s", tenant_id)
            config = {}
    else:
        config = raw_config

    tenant_name = config.get("tenantName") or tenant["company_name"]
    stamp_image_url = config.get("stampImageUrl")
    background_image_url = config.get("backgroundImageUrl")
    campaign_start = config.get("campaignStart")
    campaign_end = config.get("campaignEnd")
    campaign_description = config.get("campaignDescription")
    campaign_timezone = _normalize_campaign_timezone(
        config.get("campaignTimezone") or config.get("campaign_timezone")
    )
    language = _normalize_language(config.get("language"))
    stamp_mark = config.get("stampMark")
    coupon_usage_mode = (config.get("couponUsageMode") or "campaign").lower()
    if coupon_usage_mode not in ALLOWED_COUPON_USAGE_MODES:
        coupon_usage_mode = "campaign"
    coupon_usage_start = config.get("couponUsageStart")
    coupon_usage_end = config.get("couponUsageEnd")
    if coupon_usage_mode != "custom":
        coupon_usage_start = None
        coupon_usage_end = None
    theme_color = config.get("themeColor") or "orange"
    max_stamp_raw = config.get("maxStampCount")
    try:
        max_stamp_count = int(max_stamp_raw)
    except (TypeError, ValueError):
        max_stamp_count = None

    rules_rows = db.execute_query(
        """
        SELECT threshold, label, icon
        FROM reward_rules
        WHERE tenant_id = %s
        ORDER BY threshold
        """,
        (tenant_id,),
    )
    rules = [
        RewardRuleModel(
            threshold=row["threshold"],
            label=row["label"],
            icon=row.get("icon"),
        )
        for row in rules_rows
    ]

    store_rows = db.execute_query(
        """
        SELECT store_id, name, lat, lng, description, image_url, stamp_mark
        FROM stores
        WHERE tenant_id = %s
        ORDER BY name
        """,
        (tenant_id,),
    )
    stores = [
        StoreModel(
            id=row["store_id"],
            tenantId=tenant_id,
            name=row["name"],
            lat=float(row["lat"]),
            lng=float(row["lng"]),
            description=row.get("description"),
            imageUrl=row.get("image_url"),
            hasStamped=False,
            stampMark=row.get("stamp_mark"),
        )
        for row in store_rows
    ]

    coupons_config = config.get("initialCoupons") or config.get("initial_coupons") or []
    coupons = [
        CouponSeed(
            id=str(coupon["id"]),
            tenantId=tenant_id,
            title=coupon["title"],
            description=coupon.get("description"),
            used=bool(coupon.get("used", False)),
        )
        for coupon in coupons_config
        if "id" in coupon and "title" in coupon
    ]

    initial_progress = TenantProgressSeed(
        tenantId=tenant_id,
        stamps=int(config.get("initialStamps", 0)),
        coupons=coupons,
    )

    tenant_config = TenantConfigModel(
        id=tenant_id,
        tenantName=tenant_name,
        rules=rules,
        stampMark=stamp_mark,
        stampImageUrl=stamp_image_url,
        backgroundImageUrl=background_image_url,
        campaignStart=campaign_start,
        campaignEnd=campaign_end,
        campaignDescription=campaign_description,
        campaignTimezone=campaign_timezone,
        couponUsageMode=coupon_usage_mode,
        couponUsageStart=coupon_usage_start,
        couponUsageEnd=coupon_usage_end,
        themeColor=theme_color,
        maxStampCount=max_stamp_count,
        language=language,
    )

    return TenantSeedResponse(
        tenant=tenant_config,
        stores=stores,
        initialProgress=initial_progress,
    )


@router.get(
    "/{tenant_id}/dashboard-stats",
    response_model=TenantDashboardStatsResponse,
)
async def get_tenant_dashboard_stats(
    tenant_id: str,
    days: int = Query(14, ge=1, le=90),
    admin: dict = Depends(get_current_tenant_admin),
    db: DatabaseService = Depends(get_db_service),
) -> TenantDashboardStatsResponse:
    if admin.get("tenant_id") != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this tenant")

    range_end = date.today()
    total_days = max(1, min(days, 90))
    range_start = range_end - timedelta(days=total_days - 1)
    end_exclusive = range_end + timedelta(days=1)

    daily_rows = db.execute_query(
        """
        SELECT
            DATE(stamped_at) AS day,
            COUNT(DISTINCT user_id) AS user_count,
            COUNT(*) AS stamp_count
        FROM user_store_stamps
        WHERE tenant_id = %s
          AND stamped_at >= %s
          AND stamped_at < %s
        GROUP BY DATE(stamped_at)
        ORDER BY DATE(stamped_at)
        """,
        (tenant_id, range_start, end_exclusive),
    )

    totals_rows = db.execute_query(
        """
        SELECT
            COUNT(DISTINCT user_id) AS total_users,
            COUNT(*) AS total_stamps
        FROM user_store_stamps
        WHERE tenant_id = %s
          AND stamped_at >= %s
          AND stamped_at < %s
        """,
        (tenant_id, range_start, end_exclusive),
    )
    totals = totals_rows[0] if totals_rows else {"total_users": 0, "total_stamps": 0}
    total_users = int(totals.get("total_users", 0) or 0)
    total_stamps = int(totals.get("total_stamps", 0) or 0)

    date_sequence = [
        (range_start + timedelta(days=offset)).isoformat()
        for offset in range((range_end - range_start).days + 1)
    ]

    daily_index = {
        (
            row["day"].isoformat() if hasattr(row["day"], "isoformat") else str(row["day"])
        ): {
            "user_count": int(row.get("user_count", 0) or 0),
            "stamp_count": int(row.get("stamp_count", 0) or 0),
        }
        for row in daily_rows
    }

    daily_users = [
        DailyMetricModel(date=day_iso, count=daily_index.get(day_iso, {}).get("user_count", 0))
        for day_iso in date_sequence
    ]
    daily_stamps = [
        DailyMetricModel(date=day_iso, count=daily_index.get(day_iso, {}).get("stamp_count", 0))
        for day_iso in date_sequence
    ]

    coupon_stats: Dict[str, Dict[str, Any]] = {}

    coupon_acquired_rows = db.execute_query(
        """
        SELECT
            coupon_id,
            COALESCE(MAX(title), coupon_id) AS title,
            MAX(description) AS description,
            DATE(created_at) AS day,
            COUNT(*) AS acquired_count
        FROM user_coupons
        WHERE tenant_id = %s
          AND created_at >= %s
          AND created_at < %s
        GROUP BY coupon_id, DATE(created_at)
        ORDER BY coupon_id, day
        """,
        (tenant_id, range_start, end_exclusive),
    )

    for row in coupon_acquired_rows:
        coupon_id = row["coupon_id"]
        title = row.get("title") or coupon_id
        description = row.get("description")
        day_value = row["day"]
        day_iso = day_value.isoformat() if hasattr(day_value, "isoformat") else str(day_value)
        stats = coupon_stats.setdefault(
            coupon_id,
            {
                "couponId": coupon_id,
                "title": title,
                "description": description,
                "acquired": {key: 0 for key in date_sequence},
                "used": {key: 0 for key in date_sequence},
            },
        )
        if not stats.get("title") and title:
            stats["title"] = title
        if not stats.get("description") and description:
            stats["description"] = description
        acquired_counts = stats.setdefault("acquired", {key: 0 for key in date_sequence})
        if isinstance(acquired_counts, dict) and day_iso in acquired_counts:
            acquired_counts[day_iso] = int(row.get("acquired_count", 0) or 0)

    coupon_used_rows = db.execute_query(
        """
        SELECT
            coupon_id,
            COALESCE(MAX(title), coupon_id) AS title,
            MAX(description) AS description,
            DATE(updated_at) AS day,
            COUNT(*) AS used_count
        FROM user_coupons
        WHERE tenant_id = %s
          AND used = TRUE
          AND updated_at IS NOT NULL
          AND updated_at >= %s
          AND updated_at < %s
        GROUP BY coupon_id, DATE(updated_at)
        ORDER BY coupon_id, day
        """,
        (tenant_id, range_start, end_exclusive),
    )

    for row in coupon_used_rows:
        coupon_id = row["coupon_id"]
        title = row.get("title") or coupon_id
        description = row.get("description")
        day_value = row["day"]
        day_iso = day_value.isoformat() if hasattr(day_value, "isoformat") else str(day_value)
        stats = coupon_stats.setdefault(
            coupon_id,
            {
                "couponId": coupon_id,
                "title": title,
                "description": description,
                "acquired": {key: 0 for key in date_sequence},
                "used": {key: 0 for key in date_sequence},
            },
        )
        if not stats.get("title") and title:
            stats["title"] = title
        if not stats.get("description") and description:
            stats["description"] = description
        used_counts = stats.setdefault("used", {key: 0 for key in date_sequence})
        if isinstance(used_counts, dict) and day_iso in used_counts:
            used_counts[day_iso] = int(row.get("used_count", 0) or 0)

    reward_rule_rows = db.execute_query(
        """
        SELECT threshold, label
        FROM reward_rules
        WHERE tenant_id = %s
        """,
        (tenant_id,),
    )
    reward_rule_label_map = {
        f"tenant-{tenant_id}-rule-{row['threshold']}": row["label"]
        for row in reward_rule_rows
        if row.get("threshold") is not None and row.get("label")
    }

    for coupon_id, stats in coupon_stats.items():
        if coupon_id in reward_rule_label_map:
            stats["title"] = reward_rule_label_map[coupon_id]

    coupon_series: List[CouponDailyStatsModel] = []
    for stats in sorted(coupon_stats.values(), key=lambda item: str(item.get("couponId", ""))):
        acquired_counts = stats.get("acquired", {})
        used_counts = stats.get("used", {})

        acquired_mapping = acquired_counts if isinstance(acquired_counts, dict) else {}
        used_mapping = used_counts if isinstance(used_counts, dict) else {}

        acquired_series = [
            DailyMetricModel(date=day, count=int(acquired_mapping.get(day, 0)))
            for day in date_sequence
        ]
        used_series = [
            DailyMetricModel(date=day, count=int(used_mapping.get(day, 0)))
            for day in date_sequence
        ]

        coupon_series.append(
            CouponDailyStatsModel(
                couponId=str(stats.get("couponId")),
                title=str(stats.get("title") or stats.get("couponId")),
                description=stats.get("description"),
                acquired=acquired_series,
                used=used_series,
                totalAcquired=sum(item.count for item in acquired_series),
                totalUsed=sum(item.count for item in used_series),
            )
        )

    return TenantDashboardStatsResponse(
        rangeStart=range_start.isoformat(),
        rangeEnd=range_end.isoformat(),
        days=len(date_sequence),
        totalUsers=total_users,
        totalStamps=total_stamps,
        dailyUsers=daily_users,
        dailyStamps=daily_stamps,
        coupons=coupon_series,
    )


@router.post("/{tenant_id}/stores", response_model=StoreModel, status_code=status.HTTP_201_CREATED)
async def create_or_update_store(
    tenant_id: str,
    payload: StoreCreateRequest,
    admin: dict = Depends(get_current_tenant_admin),
    db: DatabaseService = Depends(get_db_service),
) -> StoreModel:
    if admin.get("tenant_id") != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this tenant")

    store_identifier = generate_store_identifier(payload.name, payload.store_id)
    result = db.execute_query(
        """
        INSERT INTO stores (
            tenant_id,
            store_id,
            name,
            lat,
            lng,
            description,
            image_url,
            stamp_mark
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (tenant_id, store_id)
        DO UPDATE SET
            name = EXCLUDED.name,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            description = EXCLUDED.description,
            image_url = EXCLUDED.image_url,
            stamp_mark = EXCLUDED.stamp_mark,
            updated_at = CURRENT_TIMESTAMP
        RETURNING store_id, name, lat, lng, description, image_url, stamp_mark
        """,
        (
            tenant_id,
            store_identifier,
            payload.name,
            payload.lat,
            payload.lng,
            payload.description,
            payload.image_url,
            payload.stamp_mark,
        ),
    )

    if not result:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save store")

    record = result[0]
    return StoreModel(
        id=record["store_id"],
        tenantId=tenant_id,
        name=record["name"],
        lat=float(record["lat"]),
        lng=float(record["lng"]),
        description=record.get("description"),
        imageUrl=record.get("image_url"),
        stampMark=record.get("stamp_mark"),
        hasStamped=False,
    )


@router.delete("/{tenant_id}/stores/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_store(
    tenant_id: str,
    store_id: str,
    admin: dict = Depends(get_current_tenant_admin),
    db: DatabaseService = Depends(get_db_service),
) -> None:
    if admin.get("tenant_id") != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this tenant")

    deleted = db.execute_query(
        """
        DELETE FROM stores
        WHERE tenant_id = %s AND store_id = %s
        RETURNING store_id
        """,
        (tenant_id, store_id),
    )

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")


@router.post("/{tenant_id}/reward-rules", response_model=RewardRuleModel, status_code=status.HTTP_201_CREATED)
async def upsert_reward_rule(
    tenant_id: str,
    payload: RewardRuleUpsertRequest,
    admin: dict = Depends(get_current_tenant_admin),
    db: DatabaseService = Depends(get_db_service),
) -> RewardRuleModel:
    if admin.get("tenant_id") != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this tenant")

    result = db.execute_query(
        """
        INSERT INTO reward_rules (tenant_id, threshold, label, icon)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (tenant_id, threshold)
        DO UPDATE SET
            label = EXCLUDED.label,
            icon = EXCLUDED.icon,
            updated_at = CURRENT_TIMESTAMP
        RETURNING threshold, label, icon
        """,
        (tenant_id, payload.threshold, payload.label, payload.icon),
    )

    if not result:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save reward rule")

    record = result[0]
    return RewardRuleModel(
        threshold=record["threshold"],
        label=record["label"],
        icon=record.get("icon"),
    )


@router.delete("/{tenant_id}/reward-rules/{threshold}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reward_rule(
    tenant_id: str,
    threshold: int,
    admin: dict = Depends(get_current_tenant_admin),
    db: DatabaseService = Depends(get_db_service),
) -> None:
    if admin.get("tenant_id") != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this tenant")

    deleted = db.execute_query(
        """
        DELETE FROM reward_rules
        WHERE tenant_id = %s AND threshold = %s
        RETURNING threshold
        """,
        (tenant_id, threshold),
    )

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reward rule not found")


@router.put("/{tenant_id}/campaign", response_model=TenantConfigModel)
async def update_campaign_details(
    tenant_id: str,
    payload: CampaignUpdateRequest,
    admin: dict = Depends(get_current_tenant_admin),
    db: DatabaseService = Depends(get_db_service),
) -> TenantConfigModel:
    if admin.get("tenant_id") != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this tenant")

    config_rows = db.execute_query(
        "SELECT company_name, config FROM tenants WHERE tenant_id = %s",
        (tenant_id,),
    )
    if not config_rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    company_name = config_rows[0].get("company_name") or tenant_id
    raw_config = config_rows[0].get("config") or {}
    if isinstance(raw_config, str):
        try:
            config = json.loads(raw_config)
        except json.JSONDecodeError:
            config = {}
    else:
        config = raw_config

    if payload.campaign_start is not None:
        config["campaignStart"] = payload.campaign_start
    if payload.campaign_end is not None:
        config["campaignEnd"] = payload.campaign_end
    if payload.campaign_description is not None:
        config["campaignDescription"] = payload.campaign_description
    if payload.background_image_url is not None:
        config["backgroundImageUrl"] = payload.background_image_url
    if payload.stamp_image_url is not None:
        config["stampImageUrl"] = payload.stamp_image_url
    if payload.theme_color is not None:
        color = payload.theme_color.lower()
        if color not in ALLOWED_THEME_COLORS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid theme color. Allowed values: {', '.join(sorted(ALLOWED_THEME_COLORS))}",
            )
        config["themeColor"] = color
    if payload.campaign_timezone is not None:
        tz_value = payload.campaign_timezone.strip()
        if tz_value:
            config["campaignTimezone"] = _validate_campaign_timezone(tz_value)
        else:
            config["campaignTimezone"] = DEFAULT_CAMPAIGN_TIMEZONE
    if payload.language is not None:
        lang_value = payload.language.strip()
        if lang_value:
            config["language"] = _validate_language(lang_value)
        else:
            config["language"] = DEFAULT_LANGUAGE
    if payload.coupon_usage_mode is not None:
        mode_value = payload.coupon_usage_mode.strip().lower()
        if mode_value not in ALLOWED_COUPON_USAGE_MODES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid coupon usage mode. Allowed values: {', '.join(sorted(ALLOWED_COUPON_USAGE_MODES))}",
            )
        config["couponUsageMode"] = mode_value
        if mode_value != "custom":
            config.pop("couponUsageStart", None)
            config.pop("couponUsageEnd", None)
    if payload.coupon_usage_start is not None:
        config["couponUsageStart"] = payload.coupon_usage_start or None
    if payload.coupon_usage_end is not None:
        config["couponUsageEnd"] = payload.coupon_usage_end or None
    if payload.max_stamps is not None:
        config["maxStampCount"] = payload.max_stamps
    elif "max_stamps" in payload.__fields_set__:
        config.pop("maxStampCount", None)

    campaign_timezone = _normalize_campaign_timezone(
        config.get("campaignTimezone") or config.get("campaign_timezone")
    )
    language = _normalize_language(config.get("language"))

    coupon_usage_mode = (config.get("couponUsageMode") or "campaign").lower()
    if coupon_usage_mode not in ALLOWED_COUPON_USAGE_MODES:
        coupon_usage_mode = "campaign"
    config["campaignTimezone"] = campaign_timezone
    config["language"] = language
    coupon_usage_start = config.get("couponUsageStart") if coupon_usage_mode == "custom" else None
    coupon_usage_end = config.get("couponUsageEnd") if coupon_usage_mode == "custom" else None

    db.execute_query(
        """
        UPDATE tenants
        SET config = %s::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = %s
        """,
        (json.dumps(config), tenant_id),
    )

    rules_rows = db.execute_query(
        """
        SELECT threshold, label, icon
        FROM reward_rules
        WHERE tenant_id = %s
        ORDER BY threshold
        """,
        (tenant_id,),
    )
    rules = [
        RewardRuleModel(
            threshold=row["threshold"],
            label=row["label"],
            icon=row.get("icon"),
        )
        for row in rules_rows
    ]
    max_stamp_config = config.get("maxStampCount")
    try:
        max_stamp_value = int(max_stamp_config)
    except (TypeError, ValueError):
        max_stamp_value = None

    return TenantConfigModel(
        id=tenant_id,
        tenantName=config.get("tenantName") or company_name,
        rules=rules,
        stampMark=config.get("stampMark"),
        stampImageUrl=config.get("stampImageUrl"),
        backgroundImageUrl=config.get("backgroundImageUrl"),
        campaignStart=config.get("campaignStart"),
        campaignEnd=config.get("campaignEnd"),
        campaignDescription=config.get("campaignDescription"),
        campaignTimezone=campaign_timezone,
        couponUsageMode=coupon_usage_mode,
        couponUsageStart=coupon_usage_start,
        couponUsageEnd=coupon_usage_end,
        themeColor=config.get("themeColor"),
        maxStampCount=max_stamp_value,
        language=language,
    )


@router.post("/", response_model=TenantCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    payload: TenantCreateRequest,
    db: DatabaseService = Depends(get_db_service),
) -> TenantCreateResponse:
    tenant_id = (payload.tenant_id or payload.company_name).strip().lower()
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tenant_id is required")

    existing = db.execute_query(
        "SELECT tenant_id FROM tenants WHERE tenant_id = %s",
        (tenant_id,),
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tenant already exists")

    initial_password = payload.initial_password or secrets.token_urlsafe(10)
    password_hash = get_password_hash(initial_password)

    config_payload = {
        "tenantName": payload.company_name,
        "backgroundImageUrl": payload.background_image_url,
        "initialStamps": 0,
        "initialCoupons": [],
        "campaignStart": None,
        "campaignEnd": None,
        "campaignDescription": None,
        "campaignTimezone": DEFAULT_CAMPAIGN_TIMEZONE,
        "couponUsageMode": "campaign",
        "couponUsageStart": None,
        "couponUsageEnd": None,
        "themeColor": "orange",
        "maxStampCount": None,
        "language": DEFAULT_LANGUAGE,
    }

    inserted = db.execute_query(
        """
        INSERT INTO tenants (
            tenant_id,
            company_name,
            business_type,
            admin_name,
            admin_email,
            admin_phone,
            admin_password_hash,
            admin_password_must_change,
            config,
            is_active
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, %s::jsonb, TRUE)
        RETURNING tenant_id, company_name, admin_email
        """,
        (
            tenant_id,
            payload.company_name,
            payload.business_type,
            payload.admin_name,
            payload.admin_email,
            payload.admin_phone,
            password_hash,
            json.dumps(config_payload),
        ),
    )

    if not inserted:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create tenant")

    return TenantCreateResponse(
        tenant_id=inserted[0]["tenant_id"],
        company_name=inserted[0]["company_name"],
        admin_email=inserted[0]["admin_email"],
        initial_password=initial_password,
        must_change_password=True,
    )
