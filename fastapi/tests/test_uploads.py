import os
import unittest
from io import BytesIO

from starlette.exceptions import HTTPException
from PIL import Image
import pillow_heif  # type: ignore

from routers.uploads import MAX_IMAGE_SIZE, _process_image_bytes


def _make_heic_image_bytes(
    size: tuple[int, int] = (64, 64),
    color: tuple[int, int, int] = (128, 64, 192),
) -> bytes:
    image = Image.new("RGB", size, color=color)
    heif_file = pillow_heif.from_pillow(image)
    buffer = BytesIO()
    heif_file.save(buffer)
    return buffer.getvalue()


class UploadProcessingTests(unittest.TestCase):
    def test_process_heic_image_returns_compressed_jpeg(self) -> None:
        data = _make_heic_image_bytes()
        processed, content_type, suffix = _process_image_bytes(data, "image/heic")

        self.assertEqual(content_type, "image/jpeg")
        self.assertEqual(suffix, ".jpg")
        self.assertLessEqual(len(processed), MAX_IMAGE_SIZE)

    def test_large_image_is_compressed_to_under_limit(self) -> None:
        width, height = 2048, 2048
        random_bytes = os.urandom(width * height * 3)
        image = Image.frombytes("RGB", (width, height), random_bytes)
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        data = buffer.getvalue()

        self.assertGreater(len(data), MAX_IMAGE_SIZE)

        processed, content_type, suffix = _process_image_bytes(data, "image/png")

        self.assertEqual(content_type, "image/jpeg")
        self.assertEqual(suffix, ".jpg")
        self.assertLessEqual(len(processed), MAX_IMAGE_SIZE)

    def test_small_png_is_returned_without_conversion(self) -> None:
        image = Image.new("RGB", (32, 32), color=(0, 128, 255))
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        data = buffer.getvalue()

        processed, content_type, suffix = _process_image_bytes(data, "image/png")

        self.assertEqual(processed, data)
        self.assertEqual(content_type, "image/png")
        self.assertEqual(suffix, ".png")

    def test_unsupported_mime_type_raises_http_exception(self) -> None:
        with self.assertRaises(HTTPException) as excinfo:
            _process_image_bytes(b"dummy", "image/svg+xml")
        self.assertEqual(excinfo.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
