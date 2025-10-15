import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel

from .tenants import get_current_tenant_admin

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


class UploadResponse(BaseModel):
    url: str
    filename: str
    content_type: str
    size: int


@router.post("/images", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    admin: dict = Depends(get_current_tenant_admin),
) -> UploadResponse:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="サポートされていない画像形式です。（png, jpg, gif, webp のみ）",
        )

    data = await file.read()
    size = len(data)
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="空のファイルはアップロードできません。",
        )
    if size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="画像サイズが大きすぎます。（最大5MBまで）",
        )

    suffix = ALLOWED_CONTENT_TYPES[content_type]
    filename = f"{admin.get('tenant_id', 'tenant')}-{secrets.token_hex(12)}{suffix}"
    destination = UPLOAD_DIR / filename
    destination.write_bytes(data)

    base_url = str(request.base_url).rstrip("/")
    url = f"{base_url}/static/uploads/{filename}"

    return UploadResponse(
        url=url,
        filename=filename,
        content_type=content_type,
        size=size,
    )
