import logging
from datetime import datetime, timezone
from app.database.neo4j import driver
logger = logging.getLogger(__name__)
class GraphService:
    # =========================================================
    # MEDIA -> WALLET GRAPH
    # =========================================================
    def create_media_graph(
        self,
        filename,
        wallet,
        source="file_upload",
    ):
        query = """
        MERGE (s:Source {name: $source})
        MERGE (m:Media {filename: $filename})
        SET
            m.created_at = $created_at
        MERGE (w:Wallet {
            address_key: $address_key
        })
        SET
            w.address = $address,
            w.chain = $chain,
            w.valid = $valid,
            w.confidence = $confidence,
            w.risk_score = $risk_score,
            w.risk_level = $risk_level,
            w.risk_reasons = $risk_reasons,
            w.labels = $labels,
            w.blacklisted = $blacklisted,
            w.entity_type = $entity_type,
            w.organization = $organization,
            w.country = $country,
            w.tags = $tags,
            w.sources = $sources,
            w.osint_confidence = $osint_confidence
        MERGE (s)-[:CREATED]->(m)
        MERGE (m)-[:CONTAINS]->(w)
        RETURN s, m, w
        """
        try:
            address = str(
                wallet.get("address", "")
            ).strip()
            if not address:
                logger.warning(
                    "Skipping media graph: wallet address is empty"
                )
                return
            risk_reasons = wallet.get(
                "risk_reasons",
                [],
            )
            if isinstance(risk_reasons, list):
                risk_reasons = " | ".join(
                    str(x)
                    for x in risk_reasons
                )
            else:
                risk_reasons = str(
                    risk_reasons or ""
                )
            with driver.session() as session:
                session.run(
                    query,
                    source=source,
                    filename=filename,
                    created_at=datetime.now(
                        timezone.utc
                    ).isoformat(),
                    address=address,
                    address_key=address.lower(),
                    chain=self._normalize_chain(
                        wallet.get(
                            "chain",
                            "unknown",
                        )
                    ),
                    valid=wallet.get(
                        "valid",
                        False,
                    ),
                    confidence=wallet.get(
                        "confidence",
                        0,
                    ),
                    risk_score=wallet.get(
                        "risk_score",
                        0,
                    ),
                    risk_level=str(
                        wallet.get(
                            "risk_level",
                            "LOW",
                        )
                    ).upper(),
                    risk_reasons=risk_reasons,
                    labels=wallet.get(
                        "labels",
                        [],
                    ),
                    blacklisted=wallet.get(
                        "blacklisted",
                        False,
                    ),
                    entity_type=wallet.get(
                        "entity_type",
                        "Unknown",
                    ),
                    organization=wallet.get(
                        "organization",
                        "Unknown",
                    ),
                    country=wallet.get(
                        "country",
                        "Unknown",
                    ),
                    tags=wallet.get(
                        "tags",
                        [],
                    ),
                    sources=wallet.get(
                        "sources",
                        [],
                    ),
                    osint_confidence=wallet.get(
                        "osint_confidence",
                        0,
                    ),
                ).consume()
            logger.info(
                "Media graph created | file=%s | wallet=%s",
                filename,
                address,
            )
        except Exception as e:
            logger.exception(
                "Neo4j media graph creation failed: %s",
                e,
            )
    # =========================================================
    # WALLET -> ENTITY
    # =========================================================
    def create_entity_links(
        self,
        wallet_address,
        entities,
    ):
        query = """
        MATCH (w:Wallet {
            address_key: $wallet_key
        })
        MERGE (e:Entity {
            value: $entity,
            type: $type
        })
        MERGE (w)-[:ASSOCIATED_WITH]->(e)
        """
        try:
            wallet_key = str(
                wallet_address
            ).strip().lower()
            if not wallet_key:
                return
            with driver.session() as session:
                for entity in entities:
                    value = entity.get("value")
                    if not value:
                        continue
                    session.run(
                        query,
                        wallet_key=wallet_key,
                        entity=str(
                            value
                        ).strip(),
                        type=str(
                            entity.get(
                                "type",
                                "unknown",
                            )
                        ).strip().lower(),
                    ).consume()
            logger.info(
                "Entity links created | wallet=%s",
                wallet_address,
            )
        except Exception as e:
            logger.exception(
                "Entity graph creation failed: %s",
                e,
            )
    # =========================================================
    # WALLET -> WALLET CO-OCCURRENCE
    # =========================================================
    def create_wallet_links(
        self,
        wallets,
    ):
        if len(wallets) < 2:
            return
        query = """
        MATCH (w1:Wallet {
            address_key: $wallet1
        })
        MATCH (w2:Wallet {
            address_key: $wallet2
        })
        WHERE w1 <> w2
        MERGE (w1)-[:CO_OCCURS_WITH]->(w2)
        """
        try:
            seen_pairs = set()
            with driver.session() as session:
                for i in range(len(wallets)):
                    for j in range(
                        i + 1,
                        len(wallets),
                    ):
                        wallet1 = str(
                            wallets[i].get(
                                "address",
                                "",
                            )
                        ).strip().lower()
                        wallet2 = str(
                            wallets[j].get(
                                "address",
                                "",
                            )
                        ).strip().lower()
                        if not wallet1 or not wallet2:
                            continue
                        if wallet1 == wallet2:
                            continue
                        pair = tuple(
                            sorted(
                                [
                                    wallet1,
                                    wallet2,
                                ]
                            )
                        )
                        if pair in seen_pairs:
                            continue
                        seen_pairs.add(pair)
                        session.run(
                            query,
                            wallet1=wallet1,
                            wallet2=wallet2,
                        ).consume()
            logger.info(
                "Wallet co-occurrence relationships created"
            )
        except Exception as e:
            logger.exception(
                "Wallet link creation failed: %s",
                e,
            )
    # =========================================================
    # INVESTIGATION GRAPH
    # =========================================================
    def ingest_investigation(
        self,
        investigation,
        case_id=None,
    ):
        """
        Persist one complete investigation.
        Neo4j structure:
        (:Investigation)
                |
                | HAS_ROOT
                v
        (:Wallet)
                |
                | SENT_TO
                v
        (:Wallet)
        Investigation also contains every wallet
        discovered during that investigation.
        Each investigation is identified by:
            case_id + root
        This allows the same wallet to participate
        in multiple investigations without mixing
        the investigations together.
        """
        # =====================================================
        # NORMALIZE CASE
        # =====================================================
        case_id = str(
            case_id or ""
        ).strip()
        # If no case is supplied, create a deterministic
        # fallback case identifier from the root wallet.
        investigation_root = str(
            investigation.root
        ).strip().lower()
        if not investigation_root:
            raise ValueError(
                "Investigation root cannot be empty"
            )
        if not case_id:
            case_id = (
                f"INV-"
                f"{investigation_root[:12]}"
            )
        logger.info(
            (
                "Starting investigation ingestion | "
                "case_id=%s | root=%s"
            ),
            case_id,
            investigation_root,
        )
        # =====================================================
        # INVESTIGATION METADATA
        # =====================================================
        max_depth = self._get_max_depth(
            investigation
        )
        node_count = len(
            investigation.nodes or []
        )
        edge_count = len(
            investigation.edges or []
        )
        # =====================================================
        # STEP 1
        # DELETE OLD RELATIONSHIPS FOR THIS INVESTIGATION
        # =====================================================
        cleanup_root_relationships_query = """
        MATCH (a:Wallet)-[r:SENT_TO]->(b:Wallet)
        WHERE
            toLower(
                coalesce(
                    r.investigation_root,
                    ""
                )
            ) = $root
            AND
            coalesce(
                r.case_id,
                ""
            ) = $case_id
        DELETE r
        """
        # =====================================================
        # STEP 2
        # DELETE LEGACY DUPLICATES
        # =====================================================
        cleanup_legacy_duplicates_query = """
        MATCH (a:Wallet)-[r:SENT_TO]->(b:Wallet)
        WITH
            a,
            b,
            coalesce(
                toLower(
                    toString(
                        r.tx_hash
                    )
                ),
                ""
            ) AS tx_hash,
            collect(r) AS relationships
        WHERE
            tx_hash <> ""
            AND size(relationships) > 1
        FOREACH (
            duplicate IN tail(relationships) |
            DELETE duplicate
        )
        """
        # =====================================================
        # STEP 3
        # REMOVE OLD INVESTIGATION METADATA
        # =====================================================
        cleanup_nodes_query = """
        MATCH (w:Wallet)
        WHERE
            toLower(
                coalesce(
                    w.investigation_root,
                    ""
                )
            ) = $root
            AND
            coalesce(
                w.case_id,
                ""
            ) = $case_id
        REMOVE
            w.discovered,
            w.depth,
            w.discovery_depth,
            w.is_root,
            w.investigation_root,
            w.case_id
        """
        # =====================================================
        # STEP 4
        # CREATE / UPDATE INVESTIGATION NODE
        # =====================================================
        investigation_query = """
        MERGE (i:Investigation {
            case_id: $case_id,
            root: $root
        })
        SET
            i.depth = $depth,
            i.node_count = $node_count,
            i.edge_count = $edge_count,
            i.status = "COMPLETED",
            i.updated_at = datetime(),
            i.completed_at = datetime()
        RETURN i
        """
        # =====================================================
        # STEP 5
        # NODE QUERY
        # =====================================================
        node_query = """
        MERGE (w:Wallet {
            address_key: $address_key
        })
        SET
            w.address = $address,
            w.chain = $chain,
            w.risk_score = $risk_score,
            w.risk_level = $risk_level,
            w.entity_type = $entity_type,
            w.discovered = true,
            w.depth = $depth,
            w.discovery_depth = $depth,
            w.is_root = $is_root,
            w.investigation_root = $investigation_root,
            w.case_id = $case_id,
            w.last_seen = datetime()
        """
        # =====================================================
        # STEP 6
        # INVESTIGATION -> WALLET
        # =====================================================
        investigation_wallet_query = """
        MATCH (i:Investigation {
            case_id: $case_id,
            root: $root
        })
        MATCH (w:Wallet {
            address_key: $address_key
        })
        MERGE (i)-[:CONTAINS]->(w)
        """
        # =====================================================
        # STEP 7
        # INVESTIGATION -> ROOT
        # =====================================================
        investigation_root_query = """
        MATCH (i:Investigation {
            case_id: $case_id,
            root: $root
        })
        MATCH (w:Wallet {
            address_key: $root
        })
        MERGE (i)-[:HAS_ROOT]->(w)
        """
        # =====================================================
        # STEP 8
        # TRANSACTION RELATIONSHIP
        # =====================================================
        edge_query = """
        MATCH (a:Wallet {
            address_key: $source_key
        })
        MATCH (b:Wallet {
            address_key: $target_key
        })
        MERGE (
            a
        )-[r:SENT_TO {
            tx_key: $tx_key
        }]->(
            b
        )
        SET
            r.tx_hash = $tx_hash,
            r.investigation_root = $investigation_root,
            r.case_id = $case_id,
            r.amount = $amount,
            r.timestamp = $timestamp,
            r.chain = $chain,
            r.last_updated = datetime()
        RETURN a, r, b
        """
        try:
            with driver.session() as session:
                # =================================================
                # CLEAN CURRENT CASE RELATIONSHIPS
                # =================================================
                session.run(
                    cleanup_root_relationships_query,
                    root=investigation_root,
                    case_id=case_id,
                ).consume()
                # =================================================
                # CLEAN LEGACY DUPLICATES
                # =================================================
                session.run(
                    cleanup_legacy_duplicates_query
                ).consume()
                # =================================================
                # CLEAN OLD CASE NODE METADATA
                # =================================================
                session.run(
                    cleanup_nodes_query,
                    root=investigation_root,
                    case_id=case_id,
                ).consume()
                # =================================================
                # CREATE INVESTIGATION NODE
                # =================================================
                session.run(
                    investigation_query,
                    case_id=case_id,
                    root=investigation_root,
                    depth=max_depth,
                    node_count=node_count,
                    edge_count=edge_count,
                ).consume()
                logger.info(
                    (
                        "Investigation node created | "
                        "case_id=%s | root=%s"
                    ),
                    case_id,
                    investigation_root,
                )
                # =================================================
                # CREATE / UPDATE WALLET NODES
                # =================================================
                node_map = {}
                for node in (
                    investigation.nodes or []
                ):
                    node_address = str(
                        node.address
                    ).strip()
                    if not node_address:
                        continue
                    node_address_key = (
                        node_address.lower()
                    )
                    node_map[
                        node_address_key
                    ] = node
                    node_depth = int(
                        getattr(
                            node,
                            "depth",
                            0,
                        )
                        or 0
                    )
                    node_chain = str(
                        getattr(
                            node,
                            "chain",
                            None,
                        )
                        or "unknown"
                    ).strip().lower()
                    node_chain = (
                        self._normalize_chain(
                            node_chain
                        )
                    )
                    is_root = (
                        node_address_key
                        == investigation_root
                    )
                    risk_score = float(
                        getattr(
                            node,
                            "risk_score",
                            0,
                        )
                        or 0
                    )
                    risk_level = str(
                        getattr(
                            node,
                            "risk_level",
                            None,
                        )
                        or self._risk_level(
                            risk_score
                        )
                    ).upper()
                    entity_type = (
                        getattr(
                            node,
                            "entity_type",
                            None,
                        )
                        or "Wallet"
                    )
                    # ---------------------------------------------
                    # WRITE WALLET
                    # ---------------------------------------------
                    session.run(
                        node_query,
                        address=node_address,
                        address_key=node_address_key,
                        chain=node_chain,
                        risk_score=risk_score,
                        risk_level=risk_level,
                        entity_type=entity_type,
                        depth=node_depth,
                        is_root=is_root,
                        investigation_root=(
                            investigation_root
                        ),
                        case_id=case_id,
                    ).consume()
                    # ---------------------------------------------
                    # LINK INVESTIGATION -> WALLET
                    # ---------------------------------------------
                    session.run(
                        investigation_wallet_query,
                        case_id=case_id,
                        root=investigation_root,
                        address_key=node_address_key,
                    ).consume()
                # =================================================
                # LINK INVESTIGATION -> ROOT
                # =================================================
                session.run(
                    investigation_root_query,
                    case_id=case_id,
                    root=investigation_root,
                ).consume()
                # =================================================
                # CREATE TRANSACTION RELATIONSHIPS
                # =================================================
                seen_transactions = set()
                for edge in (
                    investigation.edges or []
                ):
                    source_address = str(
                        edge.source
                    ).strip()
                    target_address = str(
                        edge.target
                    ).strip()
                    if not source_address:
                        continue
                    if not target_address:
                        continue
                    source_key = (
                        source_address.lower()
                    )
                    target_key = (
                        target_address.lower()
                    )
                    # =============================================
                    # TRANSACTION HASH
                    # =============================================
                    tx_hash = str(
                        getattr(
                            edge,
                            "tx_hash",
                            "",
                        )
                        or ""
                    ).strip()
                    # =============================================
                    # FALLBACK HASH
                    # =============================================
                    if not tx_hash:
                        tx_hash = (
                            f"{source_key}:"
                            f"{target_key}:"
                            f"{investigation_root}:"
                            f"{edge.amount}:"
                            f"{edge.timestamp}"
                        )
                    tx_hash_key = (
                        tx_hash.lower()
                    )
                    # =============================================
                    # DETERMINISTIC TRANSACTION KEY
                    # =============================================
                    tx_key = (
                        f"{source_key}:"
                        f"{target_key}:"
                        f"{tx_hash_key}:"
                        f"{investigation_root}:"
                        f"{case_id}"
                    )
                    # =============================================
                    # PYTHON DUPLICATE PROTECTION
                    # =============================================
                    if tx_key in seen_transactions:
                        continue
                    seen_transactions.add(
                        tx_key
                    )
                    # =============================================
                    # DETERMINE CHAIN
                    # =============================================
                    source_node = node_map.get(
                        source_key
                    )
                    target_node = node_map.get(
                        target_key
                    )
                    if target_node:
                        edge_chain = getattr(
                            target_node,
                            "chain",
                            "unknown",
                        )
                    elif source_node:
                        edge_chain = getattr(
                            source_node,
                            "chain",
                            "unknown",
                        )
                    else:
                        edge_chain = "unknown"
                    edge_chain = (
                        self._normalize_chain(
                            edge_chain
                        )
                    )
                    # =============================================
                    # WRITE TRANSACTION
                    # =============================================
                    session.run(
                        edge_query,
                        source_key=source_key,
                        target_key=target_key,
                        tx_key=tx_key,
                        tx_hash=tx_hash,
                        investigation_root=(
                            investigation_root
                        ),
                        case_id=case_id,
                        amount=float(
                            getattr(
                                edge,
                                "amount",
                                0,
                            )
                            or 0
                        ),
                        timestamp=(
                            getattr(
                                edge,
                                "timestamp",
                                "",
                            )
                            or ""
                        ),
                        chain=edge_chain,
                    ).consume()
            logger.info(
                (
                    "Investigation graph persisted | "
                    "case_id=%s | root=%s | "
                    "nodes=%s | edges=%s | "
                    "unique_transactions=%s | depth=%s"
                ),
                case_id,
                investigation_root,
                node_count,
                edge_count,
                len(seen_transactions),
                max_depth,
            )
        except Exception as e:
            logger.exception(
                "Investigation graph creation failed: %s",
                e,
            )
            raise
    # =========================================================
    # GET INVESTIGATION GRAPH BY CASE
    # =========================================================
    def get_case_investigation_graph(
        self,
        case_id,
    ):
        case_id = str(
            case_id or ""
        ).strip()
        if not case_id:
            return {
                "status": "ERROR",
                "case": None,
                "nodes": [],
                "edges": [],
            }
        query = """
        MATCH (i:Investigation {
            case_id: $case_id
        })
        OPTIONAL MATCH (i)-[:CONTAINS]->(w:Wallet)
        OPTIONAL MATCH
            (w)-[r:SENT_TO]->(target:Wallet)
        WHERE
            r IS NULL
            OR coalesce(
                r.case_id,
                ""
            ) = $case_id
        RETURN
            i,
            w,
            r,
            target
        """
        nodes = {}
        edges = {}
        try:
            with driver.session() as session:
                result = session.run(
                    query,
                    case_id=case_id,
                )
                investigation_data = None
                for record in result:
                    investigation_node = record["i"]
                    wallet = record["w"]
                    relation = record["r"]
                    target = record["target"]
                    # =============================================
                    # CASE INFORMATION
                    # =============================================
                    if investigation_node:
                        investigation_data = dict(
                            investigation_node
                        )
                    # =============================================
                    # WALLET
                    # =============================================
                    if wallet:
                        wallet_id = str(
                            wallet.id
                        )
                        if wallet_id not in nodes:
                            props = (
                                self._normalize_node_properties(
                                    dict(wallet)
                                )
                            )
                            nodes[wallet_id] = {
                                "id": wallet_id,
                                "label": props.get(
                                    "entity_type",
                                    "Wallet",
                                ),
                                "properties": props,
                            }
                    # =============================================
                    # TARGET WALLET
                    # =============================================
                    if target:
                        target_id = str(
                            target.id
                        )
                        if target_id not in nodes:
                            props = (
                                self._normalize_node_properties(
                                    dict(target)
                                )
                            )
                            nodes[target_id] = {
                                "id": target_id,
                                "label": props.get(
                                    "entity_type",
                                    "Wallet",
                                ),
                                "properties": props,
                            }
                    # =============================================
                    # TRANSACTION
                    # =============================================
                    if (
                        relation
                        and wallet
                        and target
                    ):
                        relation_case = str(
                            relation.get(
                                "case_id",
                                "",
                            )
                        )
                        if (
                            relation_case
                            and relation_case
                            != case_id
                        ):
                            continue
                        edge_id = str(
                            relation.id
                        )
                        if edge_id in edges:
                            continue
                        edges[edge_id] = {
                            "id": edge_id,
                            "source": str(
                                wallet.id
                            ),
                            "target": str(
                                target.id
                            ),
                            "type": relation.type,
                            "properties": dict(
                                relation
                            ),
                        }
            return {
                "status": "SUCCESS",
                "case": (
                    investigation_data
                    or {}
                ),
                "nodes": list(
                    nodes.values()
                ),
                "edges": list(
                    edges.values()
                ),
                "node_count": len(
                    nodes
                ),
                "edge_count": len(
                    edges
                ),
            }
        except Exception as e:
            logger.exception(
                (
                    "Case investigation "
                    "graph retrieval failed | "
                    "case_id=%s"
                ),
                case_id,
            )
            return {
                "status": "ERROR",
                "case": None,
                "nodes": [],
                "edges": [],
                "node_count": 0,
                "edge_count": 0,
            }
    # =========================================================
    # GET INVESTIGATION SUMMARY
    # =========================================================
    def get_investigation_summary(
        self,
        case_id,
    ):
        case_id = str(
            case_id or ""
        ).strip()
        if not case_id:
            return None
        query = """
        MATCH (i:Investigation {
            case_id: $case_id
        })
        OPTIONAL MATCH
            (i)-[:CONTAINS]->(w:Wallet)
        RETURN
            i,
            count(DISTINCT w) AS wallet_count,
            count(
                DISTINCT CASE
                    WHEN w.risk_score >= 70
                    THEN w
                END
            ) AS suspicious_wallets,
            coalesce(
                max(w.risk_score),
                0
            ) AS max_risk
        """
        try:
            with driver.session() as session:
                record = session.run(
                    query,
                    case_id=case_id,
                ).single()
                if not record:
                    return None
                investigation = dict(
                    record["i"]
                )
                return {
                    "case_id": case_id,
                    "root": investigation.get(
                        "root"
                    ),
                    "status": investigation.get(
                        "status",
                        "UNKNOWN",
                    ),
                    "depth": investigation.get(
                        "depth",
                        0,
                    ),
                    "node_count": investigation.get(
                        "node_count",
                        0,
                    ),
                    "edge_count": investigation.get(
                        "edge_count",
                        0,
                    ),
                    "wallet_count": record[
                        "wallet_count"
                    ],
                    "suspicious_wallets": record[
                        "suspicious_wallets"
                    ],
                    "max_risk": float(
                        record["max_risk"] or 0
                    ),
                    "updated_at": (
                        str(
                            investigation.get(
                                "updated_at"
                            )
                        )
                        if investigation.get(
                            "updated_at"
                        )
                        else None
                    ),
                    "completed_at": (
                        str(
                            investigation.get(
                                "completed_at"
                            )
                        )
                        if investigation.get(
                            "completed_at"
                        )
                        else None
                    ),
                }
        except Exception as e:
            logger.exception(
                (
                    "Investigation summary "
                    "retrieval failed | case_id=%s"
                ),
                case_id,
            )
            return None
    # =========================================================
    # GET ALL INVESTIGATIONS / CASES
    # =========================================================
    def get_all_investigations(
        self,
    ):
        query = """
        MATCH (i:Investigation)
        OPTIONAL MATCH
            (i)-[:CONTAINS]->(w:Wallet)
        RETURN
            i,
            count(DISTINCT w) AS wallet_count,
            count(
                DISTINCT CASE
                    WHEN w.risk_score >= 70
                    THEN w
                END
            ) AS suspicious_wallets,
            coalesce(
                max(w.risk_score),
                0
            ) AS max_risk
        ORDER BY
            i.updated_at DESC
        """
        investigations = []
        try:
            with driver.session() as session:
                result = session.run(
                    query
                )
                for record in result:
                    investigation = dict(
                        record["i"]
                    )
                    investigations.append(
                        {
                            "case_id": investigation.get(
                                "case_id"
                            ),
                            "root": investigation.get(
                                "root"
                            ),
                            "status": investigation.get(
                                "status",
                                "UNKNOWN",
                            ),
                            "depth": investigation.get(
                                "depth",
                                0,
                            ),
                            "node_count": investigation.get(
                                "node_count",
                                0,
                            ),
                            "edge_count": investigation.get(
                                "edge_count",
                                0,
                            ),
                            "wallet_count": record[
                                "wallet_count"
                            ],
                            "suspicious_wallets": record[
                                "suspicious_wallets"
                            ],
                            "max_risk": float(
                                record[
                                    "max_risk"
                                ]
                                or 0
                            ),
                            "updated_at": (
                                str(
                                    investigation.get(
                                        "updated_at"
                                    )
                                )
                                if investigation.get(
                                    "updated_at"
                                )
                                else None
                            ),
                        }
                    )
            return investigations
        except Exception as e:
            logger.exception(
                "Failed to retrieve investigations"
            )
            return []
    # =========================================================
    # GET CURRENT INVESTIGATION GRAPH BY ROOT
    # =========================================================
    def get_investigation_graph(
        self,
        root_address,
    ):
        investigation_root = str(
            root_address
        ).strip().lower()
        if not investigation_root:
            return {
                "nodes": [],
                "edges": [],
            }
        query = """
        MATCH (n:Wallet)
        WHERE
            toLower(
                coalesce(
                    n.investigation_root,
                    ""
                )
            ) = $root
            AND n.discovered = true
        OPTIONAL MATCH (
            n
        )-[r:SENT_TO]->(m:Wallet)
        WHERE
            toLower(
                coalesce(
                    r.investigation_root,
                    ""
                )
            ) = $root
        RETURN n, r, m
        """
        nodes = {}
        edges = {}
        edge_keys = set()
        try:
            with driver.session() as session:
                result = session.run(
                    query,
                    root=investigation_root,
                )
                for record in result:
                    source = record["n"]
                    target = record["m"]
                    relation = record["r"]
                    # =============================================
                    # SOURCE
                    # =============================================
                    if source:
                        sid = str(
                            source.id
                        )
                        if sid not in nodes:
                            props = (
                                self._normalize_node_properties(
                                    dict(source)
                                )
                            )
                            nodes[sid] = {
                                "id": sid,
                                "label": props.get(
                                    "entity_type",
                                    "Wallet",
                                ),
                                "properties": props,
                            }
                    # =============================================
                    # TARGET
                    # =============================================
                    if target:
                        tid = str(
                            target.id
                        )
                        if tid not in nodes:
                            props = (
                                self._normalize_node_properties(
                                    dict(target)
                                )
                            )
                            nodes[tid] = {
                                "id": tid,
                                "label": props.get(
                                    "entity_type",
                                    "Wallet",
                                ),
                                "properties": props,
                            }
                    # =============================================
                    # RELATIONSHIP
                    # =============================================
                    if (
                        relation
                        and source
                        and target
                    ):
                        relation_case = str(
                            relation.get(
                                "case_id",
                                "",
                            )
                        )
                        if (
                            relation_case
                            and relation_case
                            != str(
                                getattr(
                                    relation,
                                    "case_id",
                                    ""
                                )
                            )
                        ):
                            pass
                        tx_key = str(
                            relation.get(
                                "tx_key",
                                "",
                            )
                        )
                        tx_hash = str(
                            relation.get(
                                "tx_hash",
                                "",
                            )
                        )
                        if not tx_key:
                            tx_key = (
                                f"{str(source.id)}:"
                                f"{str(target.id)}:"
                                f"{tx_hash}"
                            )
                        if tx_key in edge_keys:
                            continue
                        edge_keys.add(
                            tx_key
                        )
                        edge_id = str(
                            relation.id
                        )
                        edges[edge_id] = {
                            "id": edge_id,
                            "source": str(
                                source.id
                            ),
                            "target": str(
                                target.id
                            ),
                            "type": relation.type,
                            "properties": dict(
                                relation
                            ),
                        }
            return {
                "nodes": list(
                    nodes.values()
                ),
                "edges": list(
                    edges.values()
                ),
            }
        except Exception as e:
            logger.exception(
                "Investigation graph retrieval failed: %s",
                e,
            )
            return {
                "nodes": [],
                "edges": [],
            }
    # =========================================================
    # GLOBAL GRAPH
    # =========================================================
    def get_graph_data(
        self,
    ):
        query = """
        MATCH (n)
        OPTIONAL MATCH
            (n)-[r]->(m)
        RETURN n, r, m
        """
        nodes = {}
        edges = {}
        edge_keys = set()
        try:
            with driver.session() as session:
                result = session.run(
                    query
                )
                for record in result:
                    source = record["n"]
                    target = record["m"]
                    relation = record["r"]
                    # =============================================
                    # SOURCE
                    # =============================================
                    if source:
                        sid = str(
                            source.id
                        )
                        if sid not in nodes:
                            props = (
                                self._normalize_node_properties(
                                    dict(source)
                                )
                            )
                            labels = list(
                                source.labels
                            )
                            node_label = (
                                labels[0]
                                if labels
                                else "Entity"
                            )
                            nodes[sid] = {
                                "id": sid,
                                "label": props.get(
                                    "entity_type",
                                    node_label,
                                ),
                                "properties": props,
                            }
                    # =============================================
                    # TARGET
                    # =============================================
                    if target:
                        tid = str(
                            target.id
                        )
                        if tid not in nodes:
                            props = (
                                self._normalize_node_properties(
                                    dict(target)
                                )
                            )
                            labels = list(
                                target.labels
                            )
                            node_label = (
                                labels[0]
                                if labels
                                else "Entity"
                            )
                            nodes[tid] = {
                                "id": tid,
                                "label": props.get(
                                    "entity_type",
                                    node_label,
                                ),
                                "properties": props,
                            }
                    # =============================================
                    # RELATIONSHIP
                    # =============================================
                    if (
                        relation
                        and source
                        and target
                    ):
                        tx_key = str(
                            relation.get(
                                "tx_key",
                                "",
                            )
                        )
                        if not tx_key:
                            tx_key = (
                                f"{source.id}:"
                                f"{target.id}:"
                                f"{relation.type}:"
                                f"{relation.get('tx_hash', '')}"
                            )
                        if tx_key in edge_keys:
                            continue
                        edge_keys.add(
                            tx_key
                        )
                        edge_id = str(
                            relation.id
                        )
                        edges[edge_id] = {
                            "id": edge_id,
                            "source": str(
                                source.id
                            ),
                            "target": str(
                                target.id
                            ),
                            "type": relation.type,
                            "properties": dict(
                                relation
                            ),
                        }
            return {
                "nodes": list(
                    nodes.values()
                ),
                "edges": list(
                    edges.values()
                ),
            }
        except Exception as e:
            logger.exception(
                "Graph retrieval failed: %s",
                e,
            )
            return {
                "nodes": [],
                "edges": [],
            }
    # =========================================================
    # NODE NORMALIZATION
    # =========================================================
    @classmethod
    def _normalize_node_properties(
        cls,
        props,
    ):
        # ---------------------------------------------------------
        # ADDRESS
        # ---------------------------------------------------------
        if props.get("address"):
            props["address"] = str(
                props["address"]
            ).strip()
        if props.get("address_key"):
            props["address_key"] = str(
                props["address_key"]
            ).strip().lower()
        # ---------------------------------------------------------
        # DEPTH
        # ---------------------------------------------------------
        raw_depth = props.get(
            "depth"
        )
        if raw_depth is None:
            raw_depth = props.get(
                "discovery_depth",
                0,
            )
        try:
            props["depth"] = int(
                raw_depth or 0
            )
        except (
            TypeError,
            ValueError,
        ):
            props["depth"] = 0
        # ---------------------------------------------------------
        # ROOT
        # ---------------------------------------------------------
        if "is_root" not in props:
            props["is_root"] = (
                props["depth"] == 0
            )
        # ---------------------------------------------------------
        # CHAIN
        # ---------------------------------------------------------
        props["chain"] = (
            cls._normalize_chain(
                props.get("chain")
            )
        )
        # ---------------------------------------------------------
        # RISK SCORE
        # ---------------------------------------------------------
        try:
            props["risk_score"] = float(
                props.get(
                    "risk_score",
                    0,
                )
                or 0
            )
        except (
            TypeError,
            ValueError,
        ):
            props["risk_score"] = 0.0
        # ---------------------------------------------------------
        # RISK LEVEL
        # ---------------------------------------------------------
        props["risk_level"] = str(
            props.get(
                "risk_level"
            )
            or cls._risk_level(
                props["risk_score"]
            )
        ).upper()
        return props
    # =========================================================
    # RISK LEVEL
    # =========================================================
    @staticmethod
    def _risk_level(
        risk_score,
    ):
        try:
            score = float(
                risk_score or 0
            )
        except (
            TypeError,
            ValueError,
        ):
            score = 0
        if score >= 85:
            return "CRITICAL"
        if score >= 70:
            return "HIGH"
        if score >= 40:
            return "MEDIUM"
        return "LOW"
    # =========================================================
    # CHAIN NORMALIZATION
    # =========================================================
    @staticmethod
    def _normalize_chain(
        chain,
    ):
        if not chain:
            return "unknown"
        value = str(
            chain
        ).strip().lower()
        mapping = {
            "eth": "ethereum",
            "ethereum": "ethereum",
            "erc20": "ethereum",
            "btc": "bitcoin",
            "bitcoin": "bitcoin",
            "tron": "tron",
            "trx": "tron",
            "sol": "solana",
            "solana": "solana",
            "ltc": "litecoin",
            "litecoin": "litecoin",
            "xrp": "ripple",
            "ripple": "ripple",
        }
        return mapping.get(
            value,
            value,
        )
    # =========================================================
    # MAX DEPTH
    # =========================================================
    @staticmethod
    def _get_max_depth(
        investigation,
    ):
        if not investigation.nodes:
            return 0
        return max(
            int(
                getattr(
                    node,
                    "depth",
                    0,
                )
                or 0
            )
            for node in investigation.nodes
        )
# =============================================================
# SINGLETON
# =============================================================
graph_service = GraphService()