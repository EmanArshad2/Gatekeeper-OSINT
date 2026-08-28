import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

driver = None
IS_NEO4J_AVAILABLE = False

try:
    if NEO4J_URI and NEO4J_USER and NEO4J_PASSWORD:
        from neo4j import GraphDatabase
        d = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD),
            max_connection_pool_size=50,
            connection_timeout=3,
            max_transaction_retry_time=5,
        )
        d.verify_connectivity()
        driver = d
        IS_NEO4J_AVAILABLE = True
        logger.info("Neo4j connection established successfully.")
    else:
        logger.info("Neo4j credentials not fully provided; running in relational fallback mode.")
except Exception as error:
    logger.warning("Neo4j connection disabled/unavailable (%s). Running in relational fallback mode.", error)
    driver = None
    IS_NEO4J_AVAILABLE = False

def is_neo4j_available() -> bool:
    return IS_NEO4J_AVAILABLE and driver is not None

def get_neo4j_driver():
    return driver

def close_neo4j():
    global driver
    if driver:
        try:
            driver.close()
            logger.info("Neo4j driver closed.")
        except Exception as error:
            logger.warning("Error closing Neo4j driver: %s", error)
        finally:
            driver = None