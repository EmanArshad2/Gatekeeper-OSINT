from app.core.osint.providers import EtherscanProvider
class InvestigationExplorer:
    """
    Discovers neighboring wallets from Ethereum transaction history.
    For every discovered wallet, the explorer keeps one representative
    transaction containing enough information for the investigation
    engine and graph layer to build a forensic relationship.
    """
    def get_neighbors(self, address: str):
        """
        Return unique neighboring wallets connected to `address`.
        Each result contains:
            {
                "address": "...",
                "direction": "INCOMING" | "OUTGOING",
                "tx": {...},
                "amount": float,
                "tx_hash": "...",
                "timestamp": "..."
            }
        A wallet is returned only once, even if multiple transactions
        exist between the same wallets.
        """
        if not address:
            return []
        address = address.strip()
        if not address:
            return []
        address_lower = address.lower()
        # ---------------------------------------------------------
        # Fetch transaction history
        # ---------------------------------------------------------
        transactions = EtherscanProvider.get_transactions(
            address
        )
        if not transactions:
            return []
        # ---------------------------------------------------------
        # Unique neighboring wallets
        #
        # Key:
        #     lowercase wallet address
        #
        # Value:
        #     representative transaction
        # ---------------------------------------------------------
        neighbors = {}
        # ---------------------------------------------------------
        # Process transactions
        # ---------------------------------------------------------
        for tx in transactions:
            if not isinstance(tx, dict):
                continue
            sender_raw = tx.get("from") or ""
            receiver_raw = tx.get("to") or ""
            sender = str(sender_raw).strip()
            receiver = str(receiver_raw).strip()
            sender_lower = sender.lower()
            receiver_lower = receiver.lower()
            # -----------------------------------------------------
            # Transaction value
            #
            # Etherscan returns normal ETH transaction value in Wei.
            # -----------------------------------------------------
            try:
                amount = (
                    float(
                        tx.get(
                            "value",
                            0,
                        )
                    )
                    / 10**18
                )
            except (
                TypeError,
                ValueError,
            ):
                amount = 0.0
            # -----------------------------------------------------
            # Transaction metadata
            # -----------------------------------------------------
            tx_hash = str(
                tx.get(
                    "hash",
                    "",
                )
                or ""
            )
            timestamp = str(
                tx.get(
                    "timeStamp",
                    "",
                )
                or ""
            )
            block_number = str(
                tx.get(
                    "blockNumber",
                    "",
                )
                or ""
            )
            # -----------------------------------------------------
            # Incoming transaction
            #
            # Another wallet -> investigated wallet
            # -----------------------------------------------------
            if (
                sender
                and sender_lower != address_lower
            ):
                self._add_neighbor(
                    neighbors=neighbors,
                    address=sender,
                    direction="INCOMING",
                    tx=tx,
                    amount=amount,
                    tx_hash=tx_hash,
                    timestamp=timestamp,
                    block_number=block_number,
                )
            # -----------------------------------------------------
            # Outgoing transaction
            #
            # Investigated wallet -> another wallet
            # -----------------------------------------------------
            if (
                receiver
                and receiver_lower != address_lower
            ):
                self._add_neighbor(
                    neighbors=neighbors,
                    address=receiver,
                    direction="OUTGOING",
                    tx=tx,
                    amount=amount,
                    tx_hash=tx_hash,
                    timestamp=timestamp,
                    block_number=block_number,
                )
        # ---------------------------------------------------------
        # Return results
        # ---------------------------------------------------------
        return list(
            neighbors.values()
        )
    # =============================================================
    # ADD UNIQUE NEIGHBOR
    # =============================================================
    @staticmethod
    def _add_neighbor(
        neighbors,
        address,
        direction,
        tx,
        amount,
        tx_hash,
        timestamp,
        block_number,
    ):
        """
        Add a wallet only once.
        If the same wallet appears in multiple transactions,
        retain the transaction with the larger value.
        This gives the investigation engine a more meaningful
        representative transaction for ranking.
        """
        if not address:
            return
        address = str(
            address
        ).strip()
        if not address:
            return
        key = address.lower()
        candidate = {
            "address": address,
            "direction": direction,
            "tx": tx,
            "amount": amount,
            "tx_hash": tx_hash,
            "timestamp": timestamp,
            "block_number": block_number,
        }
        # ---------------------------------------------------------
        # New wallet
        # ---------------------------------------------------------
        if key not in neighbors:
            neighbors[key] = candidate
            return
        # ---------------------------------------------------------
        # Existing wallet
        #
        # Keep the transaction with the larger amount.
        # ---------------------------------------------------------
        existing = neighbors[key]
        existing_amount = float(
            existing.get(
                "amount",
                0,
            )
            or 0
        )
        if amount > existing_amount:
            neighbors[key] = candidate
# =============================================================
# Singleton
# =============================================================
investigation_explorer = InvestigationExplorer()