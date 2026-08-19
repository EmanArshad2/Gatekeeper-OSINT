import logging
from app.core.osint.providers import (
    EtherscanProvider,
    intelligence_provider
)
from app.core.osint.graph_enrichment import (
    graph_enrichment_service
)
from app.core.osint.schemas import WalletOSINT
from app.core.osint import cache
from app.core.osint.transaction_analyzer import (
    transaction_analyzer
)
logger = logging.getLogger(__name__)
class OSINTService:
    def lookup(
        self,
        wallet
    ):
        address = wallet["address"]
        cached = cache.get(
            address
        )
        if cached:
            return cached
        balance = None
        transactions = []
        transaction_data = {
            "total_received": 0,
            "total_sent": 0
        }
        if wallet["chain"] == "ethereum":
            balance = EtherscanProvider.get_balance(
                address
            )
            transactions = EtherscanProvider.get_transactions(
                address
            )
            transaction_data = transaction_analyzer.analyze(
                address,
                transactions
            )
            graph_enrichment_service.enrich(
                address,
                transaction_data
            )
        intelligence = intelligence_provider.lookup_wallet(
            wallet
        )
        result = WalletOSINT(
            address=address,
            chain=wallet["chain"],
            balance=balance,
            tx_count=len(transactions),
            total_received=transaction_data.get(
                "total_received",
                0
            ),
            total_sent=transaction_data.get(
                "total_sent",
                0
            ),
            risk_score=wallet.get(
                "risk_score",
                0
            ),
            risk_level=wallet.get(
                "risk_level",
                "LOW"
            ),
            entity_type=intelligence.get(
                "entity_type",
                "Wallet"
            ),
            organization=intelligence.get(
                "organization"
            ),
            country=intelligence.get(
                "country"
            ),
            osint_confidence=(
                80
                if transactions
                else 40
            ),
            tags=intelligence.get(
                "tags",
                []
            ),
            labels=intelligence.get(
                "labels",
                []
            ),
            sources=intelligence.get(
                "sources",
                []
            )
        )
        cache.set(
            address,
            result
        )
        return result
osint_service = OSINTService()