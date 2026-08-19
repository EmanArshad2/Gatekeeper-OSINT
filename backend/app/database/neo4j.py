import os
import logging
from dotenv import load_dotenv
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable
logger = logging.getLogger(__name__)
load_dotenv()
NEO4J_URI = os.getenv(
    "NEO4J_URI"
)
NEO4J_USER = os.getenv(
    "NEO4J_USER"
)
NEO4J_PASSWORD = os.getenv(
    "NEO4J_PASSWORD"
)
if not NEO4J_URI:
    raise Exception(
        "NEO4J_URI missing from .env"
    )
if not NEO4J_USER:
    raise Exception(
        "NEO4J_USER missing from .env"
    )
if not NEO4J_PASSWORD:
    raise Exception(
        "NEO4J_PASSWORD missing from .env"
    )
try:
    driver = GraphDatabase.driver(
        NEO4J_URI,
        auth=(
            NEO4J_USER,
            NEO4J_PASSWORD
        ),
        max_connection_pool_size=50,
        connection_timeout=10,
        max_transaction_retry_time=15
    )
    driver.verify_connectivity()
    logger.info(
        "Neo4j connection established successfully"
    )
except ServiceUnavailable as e:
    logger.error(
        "Neo4j unavailable: %s",
        e
    )
    raise
except Exception as e:
    logger.exception(
        "Neo4j initialization failed: %s",
        e
    )
    raise
def get_neo4j_driver():
    return driver
def close_neo4j():
    global driver
    if driver:
        driver.close()
        logger.info(
            "Neo4j driver closed"
        )