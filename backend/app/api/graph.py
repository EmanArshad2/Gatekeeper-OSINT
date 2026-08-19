from fastapi import APIRouter, Query
from app.database.neo4j import get_neo4j_driver
router = APIRouter()
@router.get("/graph")
def get_graph(
    case_id: str | None = Query(default=None),
):
    driver = get_neo4j_driver()
    nodes = []
    edges = []
    node_ids = set()
    edge_ids = set()
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
            relation_type = (
                record["relation_type"] or "RELATED"
            )
            relation_properties = (
                record["relation_properties"] or {}
            )
            if source_id not in node_ids:
                nodes.append(
                    {
                        "id": source_id,
                        "label": (
                            source_labels[0]
                            if source_labels
                            else "Entity"
                        ),
                        "properties": source_properties,
                    }
                )
                node_ids.add(source_id)
            if target_id not in node_ids:
                nodes.append(
                    {
                        "id": target_id,
                        "label": (
                            target_labels[0]
                            if target_labels
                            else "Entity"
                        ),
                        "properties": target_properties,
                    }
                )
                node_ids.add(target_id)
            edge_id = (
                source_id,
                target_id,
                relation_type,
            )
            if edge_id not in edge_ids:
                edges.append(
                    {
                        "id": (
                            f"{source_id}-"
                            f"{target_id}-"
                            f"{relation_type}"
                        ),
                        "source": source_id,
                        "target": target_id,
                        "type": relation_type,
                        "properties": relation_properties,
                    }
                )
                edge_ids.add(edge_id)
    return {
        "status": "SUCCESS",
        "case_id": str(case_id) if case_id else None,
        "nodes": nodes,
        "edges": edges,
        "links": edges,
        "node_count": len(nodes),
        "edge_count": len(edges),
        "debug": {
            "case_filter": bool(case_id),
            "case_id": str(case_id) if case_id else None,
            "nodes_created": len(nodes),
            "edges_created": len(edges),
            "relationships_found": len(edges),
        },
    }