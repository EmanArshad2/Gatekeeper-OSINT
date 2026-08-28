"""
Extraction Service for Gatekeeper OSINT.
"""
import logging
from sqlalchemy.orm import Session
from app.core.ocr.engine import ocr_engine
from app.core.qr.scanner import qr_scanner
from app.core.wallet.detector import wallet_detector
from app.core.wallet.validator import wallet_validator
from app.core.scoring.engine import risk_engine

logger = logging.getLogger(__name__)

class ExtractionService:
    def process_raw_text(self, text: str, db: Session = None) -> dict:
        """
        Process raw text string to extract wallet addresses and calculate risk scores.
        """
        if not text:
            return {"text": "", "wallets": [], "wallet_count": 0}

        detected = wallet_detector.detect(text)
        validated_wallets = []

        for wallet in detected:
            val = wallet_validator.validate(wallet)
            risk = risk_engine.calculate(val, source="text_input")
            validated_wallets.append(risk)

        return {
            "text": text,
            "wallets": validated_wallets,
            "wallet_count": len(validated_wallets),
        }

extraction_service = ExtractionService()
