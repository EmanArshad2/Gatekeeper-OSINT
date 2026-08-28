from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.connection import get_database
from app.database.models import Wallet, Media, Extraction, Entity, CaseWallet, TelegramMessage
from app.database.neo4j import get_neo4j_driver

router = APIRouter()

@router.get("/graph")
def get_graph(
    case_id: str | None = Query(default=None),
    db: Session = Depends(get_database),
):
    driver = get_neo4j_driver()
    nodes = []
    edges = []
    node_ids = set()
    edge_ids = set()
    used_neo4j = False

    if driver is not None:
        try:
            with driver.session() as session:
                if case_id:
                    result = session.run(
                        """
                        MATCH (a)-[r]->(b)
                        WHERE
                            a.case_id = $case_id
                            OR b.case_id = $case_id
                            OR r.case_id = $case_id
                        RETURN
                            elementId(a) AS source_id,
                            elementId(b) AS target_id,
                            labels(a) AS source_labels,
                            labels(b) AS target_labels,
                            properties(a) AS source_properties,
                            properties(b) AS target_properties,
                            type(r) AS relation_type,
                            properties(r) AS relation_properties
                        ORDER BY elementId(a), elementId(b)
                        """,
                        case_id=str(case_id),
                    )
                else:
                    result = session.run(
                        """
                        MATCH (a)-[r]->(b)
                        RETURN
                            elementId(a) AS source_id,
                            elementId(b) AS target_id,
                            labels(a) AS source_labels,
                            labels(b) AS target_labels,
                            properties(a) AS source_properties,
                            properties(b) AS target_properties,
                            type(r) AS relation_type,
                            properties(r) AS relation_properties
                        ORDER BY elementId(a), elementId(b)
                        """
                    )
                for record in result:
                    source_id = record["source_id"]
                    target_id = record["target_id"]
                    source_properties = record["source_properties"] or {}
                    target_properties = record["target_properties"] or {}
                    source_labels = record["source_labels"] or []
                    target_labels = record["target_labels"] or []
                    relation_type = record["relation_type"] or "RELATED"
                    relation_properties = record["relation_properties"] or {}

                    if source_id not in node_ids:
                        nodes.append({
                            "id": source_id,
                            "label": source_labels[0] if source_labels else "Entity",
                            "properties": source_properties,
                        })
                        node_ids.add(source_id)

                    if target_id not in node_ids:
                        nodes.append({
                            "id": target_id,
                            "label": target_labels[0] if target_labels else "Entity",
                            "properties": target_properties,
                        })
                        node_ids.add(target_id)

                    edge_key = (source_id, target_id, relation_type)
                    if edge_key not in edge_ids:
                        edges.append({
                            "id": f"{source_id}-{target_id}-{relation_type}",
                            "source": source_id,
                            "target": target_id,
                            "type": relation_type,
                            "properties": relation_properties,
                        })
                        edge_ids.add(edge_key)

                used_neo4j = True
        except Exception as err:
            used_neo4j = False

    # Relational Database Fallback if Neo4j is offline or yielded no results
    if not used_neo4j or not nodes:
        wallet_query = db.query(Wallet)
        if case_id and case_id.isdigit():
            cw_links = db.query(CaseWallet).filter(CaseWallet.case_id == int(case_id)).all()
            w_ids = [l.wallet_id for l in cw_links]
            wallet_query = wallet_query.filter(Wallet.id.in_(w_ids))

        wallets = wallet_query.order_by(Wallet.created_at.desc()).limit(100).all()

        for w in wallets:
            w_node_id = f"wallet_{w.id}"
            if w_node_id not in node_ids:
                nodes.append({
                    "id": w_node_id,
                    "label": "Wallet",
                    "properties": {
                        "address": w.address,
                        "chain": w.chain,
                        "risk_score": w.risk_score or 0,
                        "risk_level": w.risk_level or "LOW",
                        "valid": w.valid,
                        "confidence": w.confidence or 0,
                        "ocr_corrected": w.ocr_corrected,
                    },
                })
                node_ids.add(w_node_id)

            # Link Wallet to its Source Extraction Media
            if w.extraction_id:
                ext = db.query(Extraction).filter(Extraction.id == w.extraction_id).first()
                if ext and ext.media_id:
                    media = db.query(Media).filter(Media.id == ext.media_id).first()
                    if media:
                        media_node_id = f"media_{media.id}"
                        if media_node_id not in node_ids:
                            nodes.append({
                                "id": media_node_id,
                                "label": "Media",
                                "properties": {
                                    "filename": media.filename,
                                    "source_type": media.source_type or "upload",
                                    "file_type": media.file_type or "image",
                                },
                            })
                            node_ids.add(media_node_id)

                        edge_key = (media_node_id, w_node_id, "CONTAINS")
                        if edge_key not in edge_ids:
                            edges.append({
                                "id": f"{media_node_id}-{w_node_id}-CONTAINS",
                                "source": media_node_id,
                                "target": w_node_id,
                                "type": "CONTAINS",
                                "properties": {"page": w.page_number or 1},
                            })
                            edge_ids.add(edge_key)

        # Build co-occurrence links between wallets share same extraction
        ext_ids = list(set(w.extraction_id for w in wallets if w.extraction_id))
        for ext_id in ext_ids:
            group = [w for w in wallets if w.extraction_id == ext_id]
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    n1 = f"wallet_{group[i].id}"
                    n2 = f"wallet_{group[j].id}"
                    edge_key = (n1, n2, "CO_OCCURS_WITH")
                    if edge_key not in edge_ids:
                        edges.append({
                            "id": f"{n1}-{n2}-CO_OCCURS_WITH",
                            "source": n1,
                            "target": n2,
                            "type": "CO_OCCURS_WITH",
                            "properties": {"extraction_id": ext_id},
                        })
                        edge_ids.add(edge_key)

    return {
        "status": "SUCCESS",
        "case_id": str(case_id) if case_id else None,
        "nodes": nodes,
        "edges": edges,
        "links": edges,
        "node_count": len(nodes),
        "edge_count": len(edges),
        "debug": {
            "used_neo4j": used_neo4j,
            "case_filter": bool(case_id),
            "nodes_created": len(nodes),
            "edges_created": len(edges),
        },
    }