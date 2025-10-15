import logging
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from database.database import DatabaseService, get_db_service
from routers.auth import UserResponse, get_current_user
from services.security import create_access_token, get_password_hash


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])


class UserCreate(BaseModel):
    tenant_id: str
    username: str
    email: EmailStr
    password: str
    role: Optional[str] = "user"
    gender: Optional[str] = None


class CouponModel(BaseModel):
    id: str
    tenantId: str
    title: str
    description: Optional[str] = None
    used: bool


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

    coupon_rows = db.execute_query(
        """
        SELECT coupon_id, tenant_id, title, description, used
        FROM user_coupons
        WHERE user_id = %s
        ORDER BY created_at, id
        """,
        (user_id,),
    )
    coupons = [
        CouponModel(
            id=row["coupon_id"],
            tenantId=row["tenant_id"],
            title=row["title"],
            description=row.get("description"),
            used=row.get("used", False),
        )
        for row in coupon_rows
    ]

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
            is_active
        )
        VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        RETURNING id, tenant_id, username, email, role, gender, is_active
        """,
        (
            payload.tenant_id,
            payload.username,
            payload.email,
            password_hash,
            payload.role or "user",
            payload.gender,
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
                description = f"{threshold}個達成で獲得したクーポン"
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
                        description=coupon_row[3],
                        used=coupon_row[4],
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
    return CouponModel(
        id=row["coupon_id"],
        tenantId=row["tenant_id"],
        title=row["title"],
        description=row.get("description"),
        used=row.get("used", True),
    )
