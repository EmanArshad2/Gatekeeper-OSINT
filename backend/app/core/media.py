import cv2
import numpy as np
import logging
from PIL import Image
from io import BytesIO
from pdf2image import convert_from_bytes
logger = logging.getLogger(__name__)
def _pil_to_cv2(pil_image: Image.Image):
    rgb_image = pil_image.convert("RGB")
    return cv2.cvtColor(np.array(rgb_image), cv2.COLOR_RGB2BGR)
def load_images(file_bytes: bytes):
    """
    Converts uploaded evidence into a list of OpenCV images — one entry
    per page for PDFs, or a single-item list for standard image formats.
    Supports:
    - JPG / JPEG / PNG / BMP  -> single-image list
    - PDF                     -> one image per page (ALL pages, not just
                                  the first), so wallet addresses on later
                                  pages are no longer silently missed.
    Returns:
        list[np.ndarray] on success (always at least one element),
        [] if the file could not be decoded as either an image or a PDF.
    """
    try:
        logger.info("Loading evidence file...")
        # Try normal image decoding first (single-page result)
        array = np.frombuffer(file_bytes, np.uint8)
        image = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if image is not None:
            logger.info("Image loaded successfully: %s", image.shape)
            return [image]
        # If image decoding fails, try PDF conversion — ALL pages
        logger.info("Image decode failed. Trying PDF (all pages)...")
        pages = convert_from_bytes(file_bytes)
        if not pages:
            logger.warning("No PDF pages found.")
            return []
        images = [_pil_to_cv2(page) for page in pages]
        logger.info(
            "PDF converted successfully: %s page(s)",
            len(images),
        )
        return images
    except Exception as e:
        logger.exception("Failed loading media: %s", str(e))
        return []
def load_image(file_bytes: bytes):
    """
    Backward-compatible single-image loader. Kept so any existing caller
    that only wants the first page keeps working unchanged. New code
    should prefer load_images() to process every page of a PDF.
    """
    images = load_images(file_bytes)
    return images[0] if images else None