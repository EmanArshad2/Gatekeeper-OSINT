import logging
from app.database.neo4j import driver
logger = logging.getLogger(__name__)
class GraphEnrichmentService:
    def enrich(
        self,
        wallet_address,
        analysis
    ):
        incoming = analysis.get(
            "incoming",
            []
        )
        outgoing = analysis.get(
            "outgoing",
            []
        )
        try:
            with driver.session() as session:
                for tx in incoming:
                    self._create_incoming(
                        session,
                        wallet_address,
                        tx
                    )
                for tx in outgoing:
                    self._create_outgoing(
                        session,
                        wallet_address,
                        tx
                    )
            logger.info(
                "Graph enrichment complete for %s",
                wallet_address
            )
        except Exception as e:
            logger.exception(
                "Graph enrichment failed: %s",
                e
            )
    def _create_incoming(
        self,
        session,
        wallet,
        tx
    ):
        query = """
        MERGE (src:Wallet {
            address:$from
        })
        MERGE (dst:Wallet {
            address:$to
        })
        SET
            src.chain = "ethereum",
            dst.chain = "ethereum"
        MERGE (src)-[r:SENT_TO]->(dst)
        SET
            r.value = $value,
            r.hash = $hash,
            r.timestamp = $timestamp
        """
        session.run(
            query,
            **tx
        )
    def _create_outgoing(
        self,
        session,
        wallet,
        tx
    ):
        query = """
        MERGE (src:Wallet {
            address:$from
        })
        MERGE (dst:Wallet {
            address:$to
        })
        SET
            src.chain = "ethereum",
            dst.chain = "ethereum"
        MERGE (src)-[r:SENT_TO]->(dst)
        SET
            r.value = $value,
            r.hash = $hash,
            r.timestamp = $timestamp
        """
        session.run(
            query,
            **tx
        )
graph_enrichment_service = GraphEnrichmentService()