from app.core.investigation.models import (
    InvestigationNode,
    InvestigationEdge,
    InvestigationResult,
)
from app.core.investigation.explorer import (
    investigation_explorer,
)
from app.core.investigation.scorer import (
    investigation_scorer,
)
class InvestigationEngine:
    """
    Core multi-hop blockchain investigation engine.
    Investigation flow:
        Depth 1
            Root
              └── Level 1
        Depth 2
            Root
              └── Level 1
                    └── Level 2
        Depth 3
            Root
              └── Level 1
                    └── Level 2
                          └── Level 3
    The engine performs a breadth-first traversal so that all wallets
    at one investigation level are processed before moving deeper.
    """
    # =============================================================
    # CONFIGURATION
    # =============================================================
    MAX_DEPTH = 3
    # Maximum number of newly discovered wallets allowed at each
    # investigation level.
    MAX_NODES_PER_LEVEL = {
        1: 100,
        2: 100,
        3: 100,
    }
    # =============================================================
    # MAIN INVESTIGATION
    # =============================================================
    def investigate(
        self,
        address: str,
        chain: str,
        risk_score: int,
        depth: int = 1,
    ):
        """
        Run a recursive multi-hop wallet investigation.
        Parameters
        ----------
        address:
            Root wallet address.
        chain:
            Blockchain associated with the investigation.
        risk_score:
            Existing risk score of the root wallet.
        depth:
            Maximum investigation depth.
            Supported values: 1, 2, 3.
        Returns
        -------
        InvestigationResult
        """
        # ---------------------------------------------------------
        # Normalize root input
        # ---------------------------------------------------------
        address = str(
            address or ""
        ).strip()
        chain = str(
            chain or "ethereum"
        ).strip().lower()
        if not address:
            raise ValueError(
                "Investigation address cannot be empty"
            )
        # ---------------------------------------------------------
        # Validate / clamp depth
        #
        # API layer already validates this, but the engine should
        # remain safe if called directly from another module.
        # ---------------------------------------------------------
        try:
            depth = int(depth)
        except (
            TypeError,
            ValueError,
        ):
            depth = 1
        depth = max(
            1,
            min(
                depth,
                self.MAX_DEPTH,
            ),
        )
        # ---------------------------------------------------------
        # Normalize root risk score
        # ---------------------------------------------------------
        try:
            risk_score = int(
                risk_score
            )
        except (
            TypeError,
            ValueError,
        ):
            risk_score = 50
        risk_score = max(
            0,
            min(
                risk_score,
                100,
            ),
        )
        # =========================================================
        # RESULT CONTAINERS
        # =========================================================
        nodes = []
        edges = []
        # =========================================================
        # DISCOVERY TRACKING
        # =========================================================
        # Wallets discovered anywhere in the investigation.
        #
        # This prevents:
        #
        # Root -> A
        # Root -> B
        # A -> B
        #
        # from creating B twice.
        discovered = set()
        # Wallets whose transaction history has already been
        # requested from Etherscan.
        scanned = set()
        # =========================================================
        # ROOT NODE
        # =========================================================
        root_node = InvestigationNode(
            address=address,
            chain=chain,
            depth=0,
            risk_score=risk_score,
        )
        nodes.append(
            root_node
        )
        root_key = address.lower()
        discovered.add(
            root_key
        )
        # =========================================================
        # CURRENT BFS LEVEL
        # =========================================================
        current_level = [
            {
                "address": address,
                "depth": 0,
                "risk_score": risk_score,
            }
        ]
        # =========================================================
        # MULTI-HOP TRAVERSAL
        # =========================================================
        for current_depth in range(
            0,
            depth,
        ):
            next_depth = current_depth + 1
            level_limit = self.MAX_NODES_PER_LEVEL.get(
                next_depth,
                100,
            )
            # Wallets that will be investigated during the next
            # iteration.
            next_level = []
            # Candidate wallets discovered from the current level.
            candidates = []
            # =====================================================
            # SCAN CURRENT LEVEL
            # =====================================================
            for current in current_level:
                current_address = str(
                    current.get(
                        "address",
                        "",
                    )
                ).strip()
                if not current_address:
                    continue
                current_key = (
                    current_address.lower()
                )
                # -------------------------------------------------
                # Do not scan the same wallet twice.
                # -------------------------------------------------
                if current_key in scanned:
                    continue
                scanned.add(
                    current_key
                )
                current_risk = current.get(
                    "risk_score",
                    risk_score,
                )
                # -------------------------------------------------
                # Discover neighboring wallets.
                # -------------------------------------------------
                try:
                    neighbors = (
                        investigation_explorer.get_neighbors(
                            current_address
                        )
                    )
                except Exception:
                    # Explorer failures should not destroy the
                    # entire investigation.
                    neighbors = []
                if not neighbors:
                    continue
                # =================================================
                # PROCESS NEIGHBORS
                # =================================================
                for item in neighbors:
                    if not isinstance(
                        item,
                        dict,
                    ):
                        continue
                    neighbor_address = str(
                        item.get(
                            "address",
                            "",
                        )
                        or ""
                    ).strip()
                    if not neighbor_address:
                        continue
                    neighbor_key = (
                        neighbor_address.lower()
                    )
                    # -------------------------------------------------
                    # Ignore already discovered wallets.
                    # -------------------------------------------------
                    if neighbor_key in discovered:
                        continue
                    # -------------------------------------------------
                    # Amount is now supplied directly by the explorer.
                    # -------------------------------------------------
                    try:
                        amount = float(
                            item.get(
                                "amount",
                                0,
                            )
                            or 0
                        )
                    except (
                        TypeError,
                        ValueError,
                    ):
                        amount = 0.0
                    # Never allow invalid negative transaction values
                    # into candidate ranking.
                    amount = max(
                        amount,
                        0.0,
                    )
                    # -------------------------------------------------
                    # Preserve explorer transaction metadata.
                    # -------------------------------------------------
                    tx = item.get(
                        "tx",
                        {},
                    )
                    if not isinstance(
                        tx,
                        dict,
                    ):
                        tx = {}
                    tx_hash = str(
                        item.get(
                            "tx_hash",
                            tx.get(
                                "hash",
                                "",
                            ),
                        )
                        or ""
                    )
                    timestamp = str(
                        item.get(
                            "timestamp",
                            tx.get(
                                "timeStamp",
                                "",
                            ),
                        )
                        or ""
                    )
                    direction = str(
                        item.get(
                            "direction",
                            "UNKNOWN",
                        )
                        or "UNKNOWN"
                    ).upper()
                    # -------------------------------------------------
                    # Add candidate.
                    # -------------------------------------------------
                    candidates.append(
                        {
                            "address": neighbor_address,
                            "parent": current_address,
                            "parent_risk": current_risk,
                            "amount": amount,
                            "tx": tx,
                            "tx_hash": tx_hash,
                            "timestamp": timestamp,
                            "direction": direction,
                        }
                    )
            # =====================================================
            # RANK CANDIDATES
            # =====================================================
            #
            # Primary:
            #     transaction amount
            #
            # Secondary:
            #     wallet address
            #
            # Sorting by address gives deterministic results when
            # multiple transactions have the same amount.
            # =====================================================
            candidates.sort(
                key=lambda item: (
                    -item["amount"],
                    item["address"].lower(),
                )
            )
            # =====================================================
            # APPLY LEVEL LIMIT
            # =====================================================
            selected = candidates[
                :level_limit
            ]
            # =====================================================
            # CREATE NODES + EDGES
            # =====================================================
            for item in selected:
                neighbor_address = item[
                    "address"
                ]
                neighbor_key = (
                    neighbor_address.lower()
                )
                # -------------------------------------------------
                # Candidate may have become discovered while
                # processing another candidate.
                # -------------------------------------------------
                if neighbor_key in discovered:
                    continue
                discovered.add(
                    neighbor_key
                )
                # =================================================
                # RISK PROPAGATION
                # =================================================
                parent_risk = item.get(
                    "parent_risk",
                    risk_score,
                )
                try:
                    parent_risk = int(
                        parent_risk
                    )
                except (
                    TypeError,
                    ValueError,
                ):
                    parent_risk = 50
                parent_risk = max(
                    0,
                    min(
                        parent_risk,
                        100,
                    ),
                )
                try:
                    child_risk = (
                        investigation_scorer.calculate(
                            parent_risk,
                            next_depth,
                        )
                    )
                except Exception:
                    # Safe fallback if the scorer fails.
                    child_risk = parent_risk
                try:
                    child_risk = int(
                        child_risk
                    )
                except (
                    TypeError,
                    ValueError,
                ):
                    child_risk = parent_risk
                child_risk = max(
                    0,
                    min(
                        child_risk,
                        100,
                    ),
                )
                # =================================================
                # CREATE CHILD NODE
                # =================================================
                child_node = InvestigationNode(
                    address=neighbor_address,
                    chain=chain,
                    depth=next_depth,
                    risk_score=child_risk,
                )
                nodes.append(
                    child_node
                )
                # =================================================
                # CREATE TRANSACTION EDGE
                # =================================================
                edges.append(
                    InvestigationEdge(
                        source=item[
                            "parent"
                        ],
                        target=neighbor_address,
                        tx_hash=item.get(
                            "tx_hash",
                            "",
                        ),
                        amount=item.get(
                            "amount",
                            0.0,
                        ),
                        timestamp=item.get(
                            "timestamp",
                            "",
                        ),
                    )
                )
                # =================================================
                # QUEUE CHILD FOR NEXT LEVEL
                # =================================================
                next_level.append(
                    {
                        "address": neighbor_address,
                        "depth": next_depth,
                        "risk_score": child_risk,
                    }
                )
            # =====================================================
            # MOVE TO NEXT BFS LEVEL
            # =====================================================
            current_level = next_level
            # -----------------------------------------------------
            # Stop early if no new wallets were discovered.
            # -----------------------------------------------------
            if not current_level:
                break
        # =========================================================
        # RETURN INVESTIGATION RESULT
        # =========================================================
        return InvestigationResult(
            root=address,
            nodes=nodes,
            edges=edges,
        )
# =============================================================
# SINGLETON
# =============================================================
investigation_engine = InvestigationEngine()