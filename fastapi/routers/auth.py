import logging
from typing import Dict, Optional, Any

from fastapi import APIRouter, Depends, Form, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr

from config import settings
from database.database import DatabaseService, get_db_service
from services.security import create_access_token, verify_password


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login", auto_error=False
)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    tenant_id: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    tenant_id: str
    gender: Optional[str] = None


class LoginRequest(BaseModel):
    identifier: str
    password: str
    tenant_id: Optional[str] = None


class OAuth2TenantRequestForm(OAuth2PasswordRequestForm):
    """OAuth2 password form extended to support tenant scoped login."""

    def __init__(
        self,
        grant_type: str = Form(default=None, regex="password"),
        username: str = Form(...),
        password: str = Form(...),
        scope: str = Form(default=""),
        client_id: Optional[str] = Form(default=None),
        client_secret: Optional[str] = Form(default=None),
        tenant_id: Optional[str] = Form(default=None),
    ):
        super().__init__(
            grant_type=grant_type,
            username=username,
            password=password,
            scope=scope,
            client_id=client_id,
            client_secret=client_secret,
        )
        self.tenant_id = tenant_id


def _fetch_user_by_identifier(
    db: DatabaseService, identifier: str, tenant_id: Optional[str]
) -> Optional[Dict[str, Any]]:
    """Fetch a user by username or email, optionally filtered by tenant."""
    conditions = ["(username = %s OR email = %s)"]
    params = [identifier, identifier]
    if tenant_id:
        conditions.append("tenant_id = %s")
        params.append(tenant_id)

    query = f"""
        SELECT
            id,
            tenant_id,
            username,
            email,
            password_hash,
            role,
            gender,
            is_active
        FROM users
        WHERE {' AND '.join(conditions)}
        LIMIT 1
    """
    records = db.execute_query(query, tuple(params))
    if not records:
        return None
    return records[0]


def _issue_access_token(user: Dict[str, Any]) -> str:
    payload = {
        "sub": user.get("username"),
        "tenant_id": user.get("tenant_id"),
        "role": user.get("role"),
    }
    return create_access_token(payload)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: DatabaseService = Depends(get_db_service),
) -> Dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        tenant_id: str = payload.get("tenant_id")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, tenant_id=tenant_id)
    except JWTError:
        raise credentials_exception

    user = _fetch_user_by_identifier(db, token_data.username, token_data.tenant_id)
    if not user:
        raise credentials_exception

    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    return user


async def get_optional_current_user(
    token: Optional[str] = Depends(optional_oauth2_scheme),
    db: DatabaseService = Depends(get_db_service),
) -> Optional[Dict[str, Any]]:
    """Like get_current_user but tolerates missing/invalid tokens."""
    if not token:
        return None
    try:
        return await get_current_user(token=token, db=db)
    except HTTPException:
        return None


def _authenticate_user(
    db: DatabaseService,
    identifier: str,
    password: str,
    tenant_id: Optional[str] = None,
) -> Dict[str, Any]:
    user = _fetch_user_by_identifier(db, identifier, tenant_id)
    if not user or not verify_password(password, user.get("password_hash")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2TenantRequestForm = Depends(),
    db: DatabaseService = Depends(get_db_service),
):
    """Password-based login endpoint using form data."""
    try:
        user = _authenticate_user(
            db=db,
            identifier=form_data.username,
            password=form_data.password,
            tenant_id=form_data.tenant_id,
        )
        access_token = _issue_access_token(user)
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Login error: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@router.post("/login/json", response_model=Token)
async def login_with_json(
    payload: LoginRequest,
    db: DatabaseService = Depends(get_db_service),
):
    """JSON body based login endpoint for SPA clients."""
    try:
        user = _authenticate_user(
            db=db,
            identifier=payload.identifier,
            password=payload.password,
            tenant_id=payload.tenant_id,
        )
        access_token = _issue_access_token(user)
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Login error: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """Return profile information for the authenticated user."""
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user.get("email", ""),
        role=current_user.get("role", ""),
        tenant_id=current_user.get("tenant_id", ""),
        gender=current_user.get("gender"),
    )
