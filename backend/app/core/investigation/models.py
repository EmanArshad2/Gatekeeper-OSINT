from pydantic import BaseModel, Field
from typing import List, Optional
# ============================================================
# Investigation Node
# ============================================================
class InvestigationNode(BaseModel):
    """
    Represents a wallet discovered during an investigation.
    """
    address: str
    chain: str = "ethereum"
    # Investigation depth
    # 0 = root wallet
    # 1 = first-level neighbor
    # 2 = second-level neighbor
    # 3 = third-level neighbor
    depth: int = 0
    # Current wallet balance
    balance: Optional[float] = None
    # Risk information
    risk_score: int = Field(
        default=0,
        ge=0,
        le=100,
    )
    risk_level: str = "LOW"
    # Intelligence / attribution
    entity_type: str = "Wallet"
    organization: Optional[str] = None
    country: Optional[str] = None
    tags: List[str] = Field(
        default_factory=list
    )
    labels: List[str] = Field(
        default_factory=list
    )
    sources: List[str] = Field(
        default_factory=list
    )
    intelligence_confidence: int = Field(
        default=0,
        ge=0,
        le=100,
    )
    # Investigation metadata
    discovered: bool = True
    discovery_reason: Optional[str] = None
# ============================================================
# Investigation Edge
# ============================================================
class InvestigationEdge(BaseModel):
    """
    Represents a transaction relationship between
    two wallets.
    """
    source: str
    target: str
    # Ethereum transaction hash
    tx_hash: str = ""
    # Transaction amount in ETH
    amount: float = 0.0
    # Original Etherscan timestamp
    timestamp: str = ""
    # Direction of transaction
    # incoming / outgoing
    direction: str = "outgoing"
    # Block information
    block_number: Optional[str] = None
    # Transaction status
    is_error: Optional[str] = None
    # Gas information
    gas_used: Optional[str] = None
    gas_price: Optional[str] = None
# ============================================================
# Investigation Result
# ============================================================
class InvestigationResult(BaseModel):
    """
    Complete result of a wallet investigation.
    """
    # Root wallet being investigated
    root: str
    # Wallets discovered during traversal
    nodes: List[InvestigationNode] = Field(
        default_factory=list
    )
    # Transaction relationships
    edges: List[InvestigationEdge] = Field(
        default_factory=list
    )
    # Investigation metadata
    max_depth: int = 0
    total_nodes: int = 0
    total_edges: int = 0
    # Investigation status
    status: str = "SUCCESS"