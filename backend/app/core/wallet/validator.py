import re
import logging
logger = logging.getLogger(__name__)
class WalletValidator:
    def validate(
        self,
        wallet
    ):
        address = wallet.get(
            "address",
            ""
        )
        chain = wallet.get(
            "chain",
            ""
        )
        result = {
            "address": address,
            "chain": chain,
            "valid": False,
            "confidence": 0,
            "validation_reason": ""
        }
        if not address:
            result["validation_reason"] = (
                "Empty wallet address"
            )
            return result
        try:
            if chain == "ethereum":
                return self.validate_ethereum(
                    result
                )
            elif chain == "bitcoin":
                return self.validate_bitcoin(
                    result
                )
            elif chain == "tron":
                return self.validate_tron(
                    result
                )
            elif chain == "litecoin":
                return self.validate_litecoin(
                    result
                )
            elif chain == "dogecoin":
                return self.validate_dogecoin(
                    result
                )
            elif chain == "solana":
                return self.validate_solana(
                    result
                )
            else:
                result["validation_reason"] = (
                    "Unsupported blockchain"
                )
                return result
        except Exception as e:
            logger.exception(
                "Wallet validation failed: %s",
                e
            )
            result["validation_reason"] = (
                "Validation exception"
            )
            return result
    def validate_ethereum(
        self,
        result
    ):
        address = result["address"]
        result["valid"] = bool(
            re.fullmatch(
                r"0x[a-fA-F0-9]{40}",
                address
            )
        )
        result["confidence"] = (
            95 if result["valid"] else 30
        )
        result["validation_reason"] = (
            "Ethereum hexadecimal address"
            if result["valid"]
            else "Invalid Ethereum format"
        )
        return result
    def validate_bitcoin(
        self,
        result
    ):
        address = result["address"]
        pattern = (
            r"^(bc1|[13])"
            r"[a-zA-HJ-NP-Z0-9]{25,90}$"
        )
        result["valid"] = bool(
            re.fullmatch(
                pattern,
                address
            )
        )
        result["confidence"] = (
            90 if result["valid"] else 30
        )
        result["validation_reason"] = (
            "Bitcoin address format"
            if result["valid"]
            else "Invalid Bitcoin format"
        )
        return result
    def validate_tron(
        self,
        result
    ):
        address = result["address"]
        pattern = (
            r"^T[1-9A-HJ-NP-Za-km-z]{33}$"
        )
        result["valid"] = bool(
            re.fullmatch(
                pattern,
                address
            )
        )
        result["confidence"] = (
            90 if result["valid"] else 30
        )
        result["validation_reason"] = (
            "TRON Base58 address"
            if result["valid"]
            else "Invalid TRON format"
        )
        return result
    def validate_litecoin(
        self,
        result
    ):
        address = result["address"]
        result["valid"] = bool(
            re.fullmatch(
                r"[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}",
                address
            )
        )
        result["confidence"] = (
            85 if result["valid"] else 30
        )
        result["validation_reason"] = (
            "Litecoin address"
            if result["valid"]
            else "Invalid Litecoin format"
        )
        return result
    def validate_dogecoin(
        self,
        result
    ):
        address = result["address"]
        result["valid"] = bool(
            re.fullmatch(
                r"D[a-zA-Z0-9]{33}",
                address
            )
        )
        result["confidence"] = (
            80 if result["valid"] else 30
        )
        result["validation_reason"] = (
            "Dogecoin address"
            if result["valid"]
            else "Invalid Dogecoin format"
        )
        return result
    def validate_solana(
        self,
        result
    ):
        address = result["address"]
        result["valid"] = bool(
            re.fullmatch(
                r"[1-9A-HJ-NP-Za-km-z]{32,44}",
                address
            )
        )
        result["confidence"] = (
            85 if result["valid"] else 30
        )
        result["validation_reason"] = (
            "Solana public key format"
            if result["valid"]
            else "Invalid Solana format"
        )
        return result
wallet_validator = WalletValidator()