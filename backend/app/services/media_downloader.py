"""
Media Downloader Service for fetching OSINT media from URLs.
"""
import logging
from pathlib import Path
import httpx

logger = logging.getLogger(__name__)

class MediaDownloader:
    async def download_file(self, url: str, destination_dir: Path) -> Path | None:
        try:
            destination_dir.mkdir(parents=True, exist_ok=True)
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(url)
                resp.raise_for_status()

            filename = Path(url.split("?")[0]).name or "downloaded_media.bin"
            target_path = destination_dir / filename
            target_path.write_bytes(resp.content)
            return target_path
        except Exception as error:
            logger.error("Failed to download media from %s: %s", url, error)
            return None

media_downloader = MediaDownloader()
