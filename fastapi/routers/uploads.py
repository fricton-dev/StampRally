import secrets
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel
from PIL import Image, ImageOps
import pillow_heif  # type: ignore
from pillow_heif import read_heif  # type: ignore

from .tenants import get_current_tenant_admin

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

try:
    pillow_heif.register_heif_opener()
except Exception:
    # HEIF サポートが初期化できない環境では、HEIC 画像を扱うタイミングでエラーを返す。
    pass

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/heic-sequence": ".heic",
    "image/heif-sequence": ".heif",
}

HEIF_CONTENT_TYPES = {
    "image/heic",
    "image/heif",
    "image/heic-sequence",
    "image/heif-sequence",
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB (保存ファイルの上限)
MAX_UPLOAD_SIZE = 20 * 1024 * 1024  # 20MB (受信時のハードリミット)


class UploadResponse(BaseModel):
    url: str
    filename: str
    content_type: str
    size: int


def _load_image_from_bytes(data: bytes, content_type: str) -> Image.Image:
    """
    Pillow が HEIC/HEIF を扱えない環境でも安全に Image を生成するユーティリティ。
    """
    normalized_type = content_type.lower()
    buffer = BytesIO(data)
    try:
        image = Image.open(buffer)
        image.load()
        return image
    except Exception:
        if normalized_type not in HEIF_CONTENT_TYPES:
            raise

    try:
        buffer.seek(0)
        heif_file = read_heif(buffer)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="HEIC 画像を解析できませんでした。",
        ) from exc

    mode = heif_file.mode or "RGB"
    image = Image.frombytes(mode, heif_file.size, heif_file.data, "raw", mode, heif_file.stride)
    return image


def _convert_image_to_jpeg(image: Image.Image) -> bytes:
    """JPEG に変換しながら 5MB を下回るようクオリティを調整する。"""
    if getattr(image, "is_animated", False):
        image.seek(0)

    image = ImageOps.exif_transpose(image)

    if image.mode == "P":
        image = image.convert("RGBA")

    if image.mode in ("RGBA", "LA"):
        background = Image.new("RGBA", image.size, (255, 255, 255, 255))
        background.alpha_composite(image.convert("RGBA"))
        image = background.convert("RGB")
    elif image.mode != "RGB":
        image = image.convert("RGB")

    for quality in range(88, 41, -6):
        buffer = BytesIO()
        image.save(buffer, format="JPEG", optimize=True, quality=quality)
        payload = buffer.getvalue()
        if len(payload) <= MAX_IMAGE_SIZE or quality <= 46:
            return payload

    raise HTTPException(
        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        detail="画像を適切なサイズに圧縮できませんでした。解像度を下げるか別形式をご利用ください。",
    )


def _process_image_bytes(data: bytes, content_type: str) -> tuple[bytes, str, str]:
    """入力バイト列を保存向けに加工して返す。"""
    normalized_type = content_type.lower()
    suffix = ALLOWED_CONTENT_TYPES.get(normalized_type)
    if suffix is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="サポートされていない画像形式です。PNG / JPEG / GIF / WEBP / HEIC を使用してください。",
        )

    # HEIC は強制的に JPEG 化する。5MB 以下でも JPEG に変換することで互換性を担保する。
    if len(data) <= MAX_IMAGE_SIZE and normalized_type not in HEIF_CONTENT_TYPES:
        return data, normalized_type, suffix

    try:
        image = _load_image_from_bytes(data, normalized_type)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="画像データを読み込めませんでした。",
        ) from exc

    jpeg_bytes = _convert_image_to_jpeg(image)
    return jpeg_bytes, "image/jpeg", ".jpg"


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
            detail="サポートされていない画像形式です。PNG / JPEG / GIF / WEBP / HEIC のみ対応しています。",
        )

    data = await file.read()
    size = len(data)
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="空のファイルはアップロードできません。",
        )
    if size > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="画像サイズが大きすぎます。（最大20MBまで）",
        )

    processed_data, final_content_type, suffix = _process_image_bytes(data, content_type)
    filename = f"{admin.get('tenant_id', 'tenant')}-{secrets.token_hex(12)}{suffix}"
    destination = UPLOAD_DIR / filename
    destination.write_bytes(processed_data)

    base_url = str(request.base_url).rstrip("/")
    url = f"{base_url}/static/uploads/{filename}"

    return UploadResponse(
        url=url,
        filename=filename,
        content_type=final_content_type,
        size=len(processed_data),
    )
