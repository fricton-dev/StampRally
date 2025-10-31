import os
from io import BytesIO

from PIL import Image
import pillow_heif  # type: ignore

from ..routers.uploads import MAX_IMAGE_SIZE, _process_image_bytes


def _make_heic_image_bytes(size: tuple[int, int] = (64, 64), color: tuple[int, int, int] = (128, 64, 192)) -> bytes:
    pillow_heif.register_heif_opener()
    image = Image.new("RGB", size, color=color)
    buffer = BytesIO()
    image.save(buffer, format="HEIC", quality=90)
    return buffer.getvalue()


def test_process_heic_image_returns_compressed_jpeg():
    data = _make_heic_image_bytes()
    processed, content_type, suffix = _process_image_bytes(data, "image/heic")

    assert content_type == "image/jpeg"
    assert suffix == ".jpg"
    assert len(processed) <= MAX_IMAGE_SIZE


def test_large_image_is_compressed_to_under_limit():
    width, height = 2048, 2048
    random_bytes = os.urandom(width * height * 3)
    image = Image.frombytes("RGB", (width, height), random_bytes)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    data = buffer.getvalue()

    assert len(data) > MAX_IMAGE_SIZE

    processed, content_type, suffix = _process_image_bytes(data, "image/png")

    assert content_type == "image/jpeg"
    assert suffix == ".jpg"
    assert len(processed) <= MAX_IMAGE_SIZE
