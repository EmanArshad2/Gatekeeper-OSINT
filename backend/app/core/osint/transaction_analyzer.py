import logging
from datetime import datetime, timezone
logger = logging.getLogger(__name__)
class TransactionAnalyzer:
    def analyze(
        self,
        wallet_address,
        transactions
    ):
        incoming = []
        outgoing = []
        total_received = 0
        total_sent = 0
        for tx in transactions:
            try:
                value_eth = int(
                    tx.get("value", 0)
                ) / 10**18
                timestamp = None
                if tx.get("timeStamp"):
                    timestamp = datetime.fromtimestamp(
                        int(tx["timeStamp"]),
                        timezone.utc
                    ).isoformat()
                sender = tx.get(
                    "from",
                    ""
                ).lower()
                receiver = tx.get(
                    "to",
                    ""
                ).lower()
                transaction = {
                    "hash": tx.get(
                        "hash"
                    ),
                    "from": sender,
                    "to": receiver,
                    "value": value_eth,
                    "timestamp": timestamp
                }
                if sender == wallet_address.lower():
                    outgoing.append(
                        transaction
                    )
                    total_sent += value_eth
                elif receiver == wallet_address.lower():
                    incoming.append(
                        transaction
                    )
                    total_received += value_eth
            except Exception as e:
                logger.exception(
                    "Transaction parsing failed: %s",
                    e
                )
        return {
            "wallet": wallet_address,
            "incoming": incoming,
            "outgoing": outgoing,
            "incoming_count": len(incoming),
            "outgoing_count": len(outgoing),
            "total_received": round(
                total_received,
                6
            ),
            "total_sent": round(
                total_sent,
                6
            )
        }
transaction_analyzer = TransactionAnalyzer()