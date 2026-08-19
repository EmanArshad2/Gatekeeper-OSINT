from pydantic import BaseModel
from typing import List, Optional
class WalletOSINT(BaseModel):
    address: str
    chain: str
    balance: Optional[float] = None
    tx_count: Optional[int] = None
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    total_received: Optional[float] = None
    total_sent: Optional[float] = None
    risk_score: int = 0
    risk_level: str = "LOW"
    exchange: Optional[str] = None
    entity_type: Optional[str] = None
    organization: Optional[str] = None
    country: Optional[str] = None
    osint_confidence: int = 0
    tags: List[str] = []
    labels: List[str] = []
    sources: List[str] = []
    blacklisted: bool = False
    source: Optional[str] = None
    notes: Optional[str] = None