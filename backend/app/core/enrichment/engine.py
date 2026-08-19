import requests
OSINT_TIMEOUT = 10
class EnrichmentEngine:
    def enrich(
        self,
        wallet
    ):
        address = wallet.get(
            "address"
        )
        if not address:
            return wallet
        wallet.setdefault(
            "entity_type",
            "Unknown"
        )
        wallet.setdefault(
            "organization",
            None
        )
        wallet.setdefault(
            "country",
            None
        )
        wallet.setdefault(
            "tags",
            []
        )
        wallet.setdefault(
            "sources",
            []
        )
        wallet.setdefault(
            "osint_confidence",
            0
        )
        #
        # Blockchair
        #
        try:
            response = requests.get(
                f"https://api.blockchair.com/ethereum/dashboards/address/{address}",
                timeout=OSINT_TIMEOUT
            )
            if response.ok:
                wallet["sources"].append(
                    "Blockchair"
                )
                wallet["osint_confidence"] += 20
        except Exception:
            pass
        #
        # Wallet labels
        #
        labels = wallet.get(
            "labels",
            []
        )
        if any(
            "exchange" in str(label).lower()
            for label in labels
        ):
            wallet["entity_type"] = "Exchange"
        elif any(
            "contract" in str(label).lower()
            for label in labels
        ):
            wallet["entity_type"] = "Smart Contract"
        elif any(
            "bridge" in str(label).lower()
            for label in labels
        ):
            wallet["entity_type"] = "Bridge"
        #
        # Risk based tags
        #
        if wallet.get(
            "blacklisted"
        ):
            wallet["tags"].append(
                "Blacklisted"
            )
        if wallet.get(
            "risk_score",
            0
        ) >= 70:
            wallet["tags"].append(
                "High Risk"
            )
        elif wallet.get(
            "risk_score",
            0
        ) >= 40:
            wallet["tags"].append(
                "Medium Risk"
            )
        else:
            wallet["tags"].append(
                "Low Risk"
            )
        return wallet
enrichment_engine = EnrichmentEngine()