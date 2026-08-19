import re
import logging
logger = logging.getLogger(__name__)
class WalletDetector:
    def __init__(self):
        # Strict patterns — exact, well-formed addresses only.
        # Matches from these are treated as full-confidence detections.
        self.patterns = {
            "ethereum": (
                r"\b0x[a-fA-F0-9]{40}\b"
            ),
            "bitcoin": (
                r"\b("
                r"bc1[a-zA-HJ-NP-Z0-9]{25,90}"
                r"|"
                r"[13][a-km-zA-HJ-NP-Z1-9]{25,34}"
                r")\b"
            ),
            "tron": (
                r"\bT[1-9A-HJ-NP-Za-km-z]{33}\b"
            ),
            "litecoin": (
                r"\b[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}\b"
            ),
            "dogecoin": (
                r"\bD[a-zA-Z0-9]{33}\b"
            ),
            "solana": (
                r"\b[1-9A-HJ-NP-Za-km-z]{32,44}\b"
            )
        }
        # OCR-tolerant patterns — catch addresses where OCR has confused
        # visually similar characters (0/O, 1/I/l). These are only used
        # in well-defined, unambiguous positions:
        #   - Ethereum: the entire address is hexadecimal, so any O/I/l
        #     appearing in it is *necessarily* a misread of 0/1 — there is
        #     no ambiguity, hex has no such letters.
        #   - Bitcoin/Litecoin: the FIRST character is a fixed, known
        #     value ('1', '3', 'L', 'M'). Base58 (the rest of the address)
        #     never contains 0/O/I/l, so we deliberately do NOT attempt to
        #     "fix" characters inside the body — guessing there would risk
        #     fabricating a wrong address. Only the fixed leading
        #     character is corrected.
        self._eth_tolerant = re.compile(
            r"\b[0oO]x[a-fA-F0-9oOiIl]{40}\b"
        )
        self._btc_leading_tolerant = re.compile(
            r"\b[iI][a-km-zA-HJ-NP-Z1-9]{25,34}\b"
        )
    def detect(self, text):
        if not text:
            logger.warning("Wallet detector received empty text.")
            return []
        logger.info("Scanning text for wallet addresses...")
        found = {}
        # ---- Pass 1: strict, exact matches (full confidence) ----
        for chain, pattern in self.patterns.items():
            for match in re.finditer(pattern, text):
                address = match.group(0)
                if isinstance(address, tuple):
                    address = address[0]
                address = address.strip()
                if address in found:
                    continue
                found[address] = {
                    "address": address,
                    "chain": chain,
                    "source": "ocr_qr_extraction",
                    "confidence": self.calculate_confidence(address, chain),
                    "ocr_corrected": False,
                }
        # ---- Pass 2: OCR-tolerant matches (reduced confidence) ----
        for chain, corrected_address, raw_token in self._detect_ocr_tolerant(
            text
        ):
            if corrected_address in found:
                continue
            base_confidence = self.calculate_confidence(
                corrected_address, chain
            )
            found[corrected_address] = {
                "address": corrected_address,
                "chain": chain,
                "source": "ocr_qr_extraction",
                "confidence": max(base_confidence - 25, 35),
                "ocr_corrected": True,
                "raw_ocr_text": raw_token,
            }
        wallets = list(found.values())
        logger.info(
            "Wallet detection completed. Found %s wallets (%s OCR-corrected).",
            len(wallets),
            sum(1 for w in wallets if w["ocr_corrected"]),
        )
        return wallets
    def _detect_ocr_tolerant(self, text):
        """
        Finds address-shaped tokens that fail the strict patterns only
        because of common OCR look-alike substitutions, and returns the
        corrected address alongside the raw OCR text for transparency.
        """
        results = []
        # Ethereum — every character must be hex, so O/I/l inside the
        # token can only be a misread of 0/1. Safe to correct fully.
        for match in self._eth_tolerant.finditer(text):
            raw = match.group(0)
            body = raw[2:]
            body = re.sub(r"[oO]", "0", body)
            body = re.sub(r"[iIl]", "1", body)
            corrected = "0x" + body
            if re.fullmatch(r"0x[a-fA-F0-9]{40}", corrected) and corrected != raw:
                results.append(("ethereum", corrected, raw))
        # Bitcoin legacy — only the known-fixed leading character is
        # corrected ('I' misread of '1'). The base58 body is left
        # untouched since we cannot safely infer the original character.
        for match in self._btc_leading_tolerant.finditer(text):
            raw = match.group(0)
            corrected = "1" + raw[1:]
            if re.fullmatch(
                r"[13][a-km-zA-HJ-NP-Z1-9]{25,34}", corrected
            ) and corrected != raw:
                results.append(("bitcoin", corrected, raw))
        return results
    def calculate_confidence(
        self,
        address,
        chain
    ):
        """
        Basic confidence score.
        Later replace with ML/risk model.
        """
        length = len(address)
        if chain == "ethereum":
            return 95 if length == 42 else 70
        if chain == "bitcoin":
            return 90
        if chain == "tron":
            return 90
        if chain == "solana":
            return 85
        return 75
wallet_detector = WalletDetector()