import logging
logger = logging.getLogger(__name__)
class RiskScoringEngine:
    def calculate(
        self,
        wallet,
        source="file_upload"
    ):
        score = 0
        reasons = []
        risk_factors = []
        address = wallet.get(
            "address",
            ""
        )
        chain = wallet.get(
            "chain",
            ""
        )
        confidence = wallet.get(
            "confidence",
            0
        )
        valid = wallet.get(
            "valid",
            False
        )
        #
        # Validation score
        #
        if valid:
            score += 20
            reasons.append(
                "Valid blockchain address format"
            )
            risk_factors.append(
                "VALID_ADDRESS"
            )
        #
        # Detection confidence
        #
        if confidence >= 95:
            score += 15
            reasons.append(
                "High extraction confidence"
            )
            risk_factors.append(
                "HIGH_CONFIDENCE"
            )
        elif confidence >= 80:
            score += 10
            reasons.append(
                "Medium extraction confidence"
            )
        #
        # Evidence source
        #
        if source == "file_upload":
            score += 10
            reasons.append(
                "Wallet recovered from digital evidence"
            )
            risk_factors.append(
                "DIGITAL_EVIDENCE"
            )
        elif source == "qr_scan":
            score += 15
            reasons.append(
                "Wallet extracted from QR payload"
            )
            risk_factors.append(
                "QR_RECOVERY"
            )
        #
        # Blockchain weighting
        #
        if chain == "ethereum":
            score += 5
            reasons.append(
                "Ethereum ecosystem asset"
            )
        elif chain == "bitcoin":
            score += 5
            reasons.append(
                "Bitcoin ecosystem asset"
            )
        elif chain == "tron":
            score += 8
            reasons.append(
                "TRON address detected"
            )
            risk_factors.append(
                "TRON_NETWORK"
            )
        #
        # Suspicious address patterns
        #
        if address:
            if address.lower().startswith(
                "0x"
            ):
                if address[-4:].lower() in [
                    "dead",
                    "0000"
                ]:
                    score += 10
                    reasons.append(
                        "Suspicious address pattern"
                    )
                    risk_factors.append(
                        "PATTERN_MATCH"
                    )
        #
        # Final normalization
        #
        score = min(
            score,
            100
        )
        if score >= 80:
            level = "HIGH"
        elif score >= 50:
            level = "MEDIUM"
        else:
            level = "LOW"
        logger.info(
            "Wallet risk calculated %s %s",
            address,
            score
        )
        return {
            **wallet,
            "risk_score": score,
            "risk_level": level,
            "risk_reasons": reasons,
            "risk_factors": risk_factors
        }
risk_engine = RiskScoringEngine()