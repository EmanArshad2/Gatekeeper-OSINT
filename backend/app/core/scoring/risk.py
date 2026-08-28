"""
Risk levels and scoring constants for Gatekeeper Crypto OSINT Engine.
"""

RISK_LEVEL_LOW = "LOW"
RISK_LEVEL_MEDIUM = "MEDIUM"
RISK_LEVEL_HIGH = "HIGH"
RISK_LEVEL_CRITICAL = "CRITICAL"

RISK_THRESHOLDS = {
    RISK_LEVEL_CRITICAL: 85.0,
    RISK_LEVEL_HIGH: 70.0,
    RISK_LEVEL_MEDIUM: 40.0,
    RISK_LEVEL_LOW: 0.0,
}

def get_risk_level(score: float) -> str:
    """Classify numeric risk score into a risk level label."""
    if score >= RISK_THRESHOLDS[RISK_LEVEL_CRITICAL]:
        return RISK_LEVEL_CRITICAL
    if score >= RISK_THRESHOLDS[RISK_LEVEL_HIGH]:
        return RISK_LEVEL_HIGH
    if score >= RISK_THRESHOLDS[RISK_LEVEL_MEDIUM]:
        return RISK_LEVEL_MEDIUM
    return RISK_LEVEL_LOW

def get_risk_color(level: str) -> str:
    """Return hex color representation for risk levels."""
    level = (level or "").upper()
    if level == RISK_LEVEL_CRITICAL:
        return "#dc2626"
    if level == RISK_LEVEL_HIGH:
        return "#f97316"
    if level == RISK_LEVEL_MEDIUM:
        return "#eab308"
    return "#22c55e"
