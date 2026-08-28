import logging
import traceback
import cv2
import easyocr
import numpy as np
logger = logging.getLogger(__name__)
class OCREngine:
    def __init__(self):
        logger.info("Initializing EasyOCR...")
        self.reader = easyocr.Reader(
            ["en"],
            gpu=False,
            verbose=False
        )
        logger.info(
            "EasyOCR initialized successfully."
        )
    # ==========================================
    # OCR FROM OPENCV IMAGE
    # ==========================================
    def extract_text(self, image):
        try:
            logger.info(
                "Starting OCR"
            )
            if image is None:
                logger.warning(
                    "OCR received empty image."
                )
                return ""
            logger.debug(
                "Image shape: %s",
                image.shape
            )
            # Resize large images
            h, w = image.shape[:2]
            if max(h, w) > 1200:
                scale = 1200 / max(h, w)
                image = cv2.resize(
                    image,
                    (
                        int(w * scale),
                        int(h * scale)
                    ),
                    interpolation=cv2.INTER_AREA
                )
                logger.info(
                    "Image resized: %s",
                    image.shape
                )
            logger.info(
                "Running EasyOCR..."
            )
            result = self.reader.readtext(
                image,
                detail=0,
                paragraph=False
            )
            logger.debug(
                "OCR result: %s",
                result
            )
            text = "\n".join(result)
            logger.info(
                "OCR completed. Characters: %s",
                len(text)
            )
            return text
        except Exception as e:
            logger.error(
                "OCR failed: %s",
                str(e)
            )
            traceback.print_exc()
            return ""
    # ==========================================
    # OCR FROM IMAGE PATH
    # Used by Telegram Collector
    # ==========================================
    def extract_image(self, path):
        try:
            logger.info(
                "Loading image: %s",
                path
            )
            image = cv2.imread(
                path
            )
            if image is None:
                logger.warning(
                    "Unable to load image"
                )
                return ""
            return self.extract_text(
                image
            )
        except Exception as e:
            logger.error(
                "Image OCR failed: %s",
                e
            )
            traceback.print_exc()
            return ""
    # ==========================================
    # OCR FROM PDF
    # Used by Telegram Collector
    # ==========================================
    def extract_pdf(self, path):
        full_text = ""
        # Attempt 1: Direct text extraction via pypdf / pypdf2 / pdfplumber
        try:
            import pypdf
            reader = pypdf.PdfReader(path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    full_text += "\n" + extracted
            if full_text.strip():
                logger.info("Direct PDF text extraction succeeded via pypdf (%s chars)", len(full_text))
                return full_text.strip()
        except Exception as pypdf_err:
            logger.debug("pypdf extraction skipped: %s", pypdf_err)

        # Attempt 2: Image rendering + EasyOCR via pdf2image
        try:
            logger.info("Processing PDF via pdf2image OCR: %s", path)
            from pdf2image import convert_from_path
            pages = convert_from_path(path)
            for index, page in enumerate(pages):
                logger.info("Processing PDF page %s", index + 1)
                image = cv2.cvtColor(np.array(page), cv2.COLOR_RGB2BGR)
                text = self.extract_text(image)
                if text:
                    full_text += "\n" + text
            logger.info("PDF OCR completed")
            return full_text.strip()
        except Exception as e:
            logger.error("PDF OCR failed: %s", e)
            return full_text.strip()
ocr_engine = OCREngine()