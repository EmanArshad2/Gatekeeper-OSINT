import logging
import re
import unicodedata
logger = logging.getLogger(__name__)
MOJIBAKE_MARKERS = (
    "Ã",
    "Â",
    "â€",
    "â€™",
    "â€œ",
    "â€�",
    "â€“",
    "â€”",
    "ð",
    "ï¿½",
)
def repair_mojibake(text: str) -> str:
    """
    Repair common UTF-8 -> Latin-1/Windows-1252 mojibake.
    Example:
        "CybersÃ©curitÃ©"
            ->
        "Cybersécurité"
    The conversion is only attempted when the text contains
    common mojibake markers, preventing normal Unicode text
    from being unnecessarily modified.
    """
    if not text:
        return ""
    current = str(text)
    # Some corrupted strings require more than one pass.
    for _ in range(2):
        if not any(marker in current for marker in MOJIBAKE_MARKERS):
            break
        try:
            repaired = current.encode(
                "latin-1",
                errors="strict",
            ).decode(
                "utf-8",
                errors="strict",
            )
            if repaired == current:
                break
            current = repaired
        except (
            UnicodeEncodeError,
            UnicodeDecodeError,
        ):
            break
    return unicodedata.normalize(
        "NFC",
        current,
    )
def normalize_ocr_text(text: str) -> str:
    """
    Produce analyst-friendly OCR text.
    This does NOT replace the raw OCR.
    Raw OCR remains evidence.
    """
    if not text:
        return ""
    text = repair_mojibake(text)
    # Normalize line endings.
    text = text.replace(
        "\r\n",
        "\n",
    ).replace(
        "\r",
        "\n",
    )
    # Remove zero-width/control characters.
    text = re.sub(
        r"[\u0000-\u001F\u007F-\u009F]",
        " ",
        text,
    )
    # Normalize excessive spaces.
    text = re.sub(
        r"[ \t]+",
        " ",
        text,
    )
    # Remove repeated blank lines.
    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )
    # Clean obvious OCR-only noise lines.
    cleaned_lines = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        # Ignore extremely short punctuation-only fragments.
        if len(line) <= 2 and not re.search(
            r"[A-Za-z0-9]",
            line,
        ):
            continue
        cleaned_lines.append(line)
    return "\n".join(
        cleaned_lines
    ).strip()
def calculate_ocr_quality(
    raw_text: str,
    normalized_text: str,
) -> dict:
    """
    Heuristic OCR quality score.
    IMPORTANT:
    This is a quality estimate, NOT native OCR confidence.
    """
    raw = raw_text or ""
    normalized = normalized_text or ""
    if not raw.strip():
        return {
            "score": 0,
            "label": "NONE",
            "method": "heuristic",
        }
    chars = len(raw)
    alnum_chars = sum(
        char.isalnum()
        for char in raw
    )
    printable_chars = sum(
        char.isprintable() or char == "\n"
        for char in raw
    )
    alpha_chars = sum(
        char.isalpha()
        for char in raw
    )
    words = re.findall(
        r"\b[\w@#$%.-]{2,}\b",
        normalized,
        flags=re.UNICODE,
    )
    # Base score from useful printable/alphanumeric content.
    printable_ratio = (
        printable_chars / chars
        if chars
        else 0
    )
    alnum_ratio = (
        alnum_chars / chars
        if chars
        else 0
    )
    score = (
        printable_ratio * 40
        + alnum_ratio * 35
        + min(len(words), 30) / 30 * 25
    )
    # Penalize excessive one-character noise.
    lines = [
        line.strip()
        for line in raw.splitlines()
        if line.strip()
    ]
    if lines:
        noisy_lines = sum(
            1
            for line in lines
            if len(line) <= 2
        )
        noise_ratio = (
            noisy_lines / len(lines)
        )
        score -= noise_ratio * 30
    score = max(
        0,
        min(
            100,
            round(score),
        ),
    )
    if score >= 80:
        label = "HIGH"
    elif score >= 55:
        label = "MEDIUM"
    elif score > 0:
        label = "LOW"
    else:
        label = "NONE"
    return {
        "score": score,
        "label": label,
        "method": "heuristic",
        "raw_characters": chars,
        "normalized_characters": len(
            normalized
        ),
        "word_count": len(words),
        "alpha_characters": alpha_chars,
    }