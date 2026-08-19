import asyncio
from app.core.telegram.collector import start_collector
if __name__ == "__main__":
    asyncio.run(
        start_collector()
    )