import cv2
import logging
import numpy as np
from pyzbar.pyzbar import decode
logger = logging.getLogger(__name__)
class QRScanner:
    def scan(self, image):
        results = []
        try:
            print(
                "QR INPUT TYPE:",
                type(image)
            )
            if image is None:
                logger.warning(
                    "Empty QR image received"
                )
                return results
            # Ensure numpy image
            if not isinstance(
                image,
                np.ndarray
            ):
                logger.warning(
                    "Invalid QR image type"
                )
                return results
            gray = cv2.cvtColor(
                image,
                cv2.COLOR_BGR2GRAY
            )
            processed_images = [
                image,
                gray
            ]
            _, threshold = cv2.threshold(
                gray,
                120,
                255,
                cv2.THRESH_BINARY
            )
            processed_images.append(
                threshold
            )
            h, w = gray.shape[:2]
            if max(h, w) < 800:
                scale = 800 / max(
                    h,
                    w
                )
                resized = cv2.resize(
                    gray,
                    (
                        int(w * scale),
                        int(h * scale)
                    ),
                    interpolation=cv2.INTER_CUBIC
                )
                processed_images.append(
                    resized
                )
            for img in processed_images:
                decoded = decode(
                    img
                )
                for item in decoded:
                    try:
                        data = item.data.decode(
                            "utf-8"
                        )
                        if data not in results:
                            results.append(
                                data
                            )
                    except Exception:
                        pass
            print(
                "QR FOUND:",
                results
            )
            return results
        except Exception as e:
            logger.exception(
                "QR scanning failed: %s",
                e
            )
            return results
qr_scanner = QRScanner()