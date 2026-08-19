import asyncio
import logging
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
import requests
from app.core.wallet.detector import wallet_detector
from app.core.wallet.validator import wallet_validator
logger = logging.getLogger(__name__)
class WebsiteHTMLParser(HTMLParser):
    """
    Lightweight HTML parser for extracting visible text,
    links, images, and page metadata without requiring
    an additional HTML parsing dependency.
    """
    SKIP_TAGS = {
        "script",
        "style",
        "noscript",
        "svg",
        "template",
    }
    def __init__(self):
        super().__init__()
        self.text_parts = []
        self.links = []
        self.images = []
        self.title = ""
        self._skip_depth = 0
        self._in_title = False
    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attributes = dict(attrs)
        if tag in self.SKIP_TAGS:
            self._skip_depth += 1
            return
        if tag == "title":
            self._in_title = True
        if tag == "a":
            href = attributes.get("href")
            if href:
                self.links.append(href)
        if tag == "img":
            src = (
                attributes.get("src")
                or attributes.get("data-src")
            )
            if src:
                self.images.append(src)
    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in self.SKIP_TAGS:
            if self._skip_depth > 0:
                self._skip_depth -= 1
            return
        if tag == "title":
            self._in_title = False
    def handle_data(self, data):
        if self._skip_depth > 0:
            return
        cleaned = " ".join(data.split())
        if not cleaned:
            return
        if self._in_title:
            self.title += f" {cleaned}"
        self.text_parts.append(cleaned)
    def get_text(self):
        return "\n".join(self.text_parts).strip()
    def get_title(self):
        return " ".join(self.title.split()).strip()
class WebsiteCollector:
    """
    Collects intelligence from publicly accessible webpages.
    Current responsibilities:
    - Fetch webpage
    - Extract visible text
    - Extract links
    - Extract image URLs
    - Detect URLs
    - Detect cryptocurrency wallets
    - Validate detected wallets
    - Return normalized collection data
    """
    USER_AGENT = (
        "Gatekeeper-OSINT/1.0 "
        "(Forensic Intelligence Collection)"
    )
    DEFAULT_TIMEOUT = 20
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": self.USER_AGENT,
                "Accept": (
                    "text/html,"
                    "application/xhtml+xml,"
                    "application/xml;q=0.9,"
                    "image/avif,"
                    "image/webp,"
                    "*/*;q=0.8"
                ),
            }
        )
    def _validate_url(self, url):
        """
        Validate that the supplied target is an HTTP/HTTPS URL.
        """
        if not url:
            raise ValueError("Website URL is required.")
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            raise ValueError(
                "Only HTTP and HTTPS URLs are supported."
            )
        if not parsed.netloc:
            raise ValueError(
                "Invalid website URL."
            )
        return url
    def _normalize_url(self, url, base_url):
        """
        Convert relative URLs into absolute URLs.
        """
        try:
            return urljoin(base_url, url)
        except Exception:
            return None
    def _extract_urls_from_text(self, text):
        """
        Extract explicit HTTP/HTTPS URLs appearing in page text.
        """
        if not text:
            return []
        pattern = (
            r"https?://"
            r"(?:[A-Za-z0-9-]+\.)+"
            r"[A-Za-z]{2,}"
            r"(?:/[^\s<>\"]*)?"
        )
        return list(
            dict.fromkeys(
                re.findall(pattern, text)
            )
        )
    def _detect_wallets(self, text):
        """
        Detect and validate cryptocurrency wallet addresses
        from collected webpage text.
        """
        detected = wallet_detector.detect(text)
        validated = []
        for wallet in detected:
            result = wallet_validator.validate(wallet)
            if result.get("valid"):
                validated.append(
                    {
                        **wallet,
                        **result,
                        "source": "website",
                    }
                )
        return validated
    def collect(self, url):
        """
        Collect intelligence from a single webpage.
        """
        url = self._validate_url(url)
        logger.info(
            "Website collection started: %s",
            url,
        )
        response = self.session.get(
            url,
            timeout=self.DEFAULT_TIMEOUT,
            allow_redirects=True,
        )
        response.raise_for_status()
        content_type = (
            response.headers.get(
                "content-type",
                "",
            )
            .lower()
        )
        if "text/html" not in content_type:
            logger.warning(
                "Target is not an HTML webpage: %s",
                content_type,
            )
            return {
                "status": "SUCCESS",
                "source": "Website",
                "url": url,
                "final_url": response.url,
                "title": "",
                "text": "",
                "links": [],
                "images": [],
                "wallets": [],
                "wallet_count": 0,
                "status_code": response.status_code,
                "content_type": content_type,
            }
        parser = WebsiteHTMLParser()
        parser.feed(response.text)
        parser.close()
        text = parser.get_text()
        title = parser.get_title()
        links = []
        for link in parser.links:
            normalized = self._normalize_url(
                link,
                response.url,
            )
            if normalized:
                links.append(normalized)
        links = list(
            dict.fromkeys(links)
        )
        images = []
        for image in parser.images:
            normalized = self._normalize_url(
                image,
                response.url,
            )
            if normalized:
                images.append(normalized)
        images = list(
            dict.fromkeys(images)
        )
        text_urls = self._extract_urls_from_text(
            text
        )
        all_urls = list(
            dict.fromkeys(
                links + text_urls
            )
        )
        wallets = self._detect_wallets(
            text
        )
        result = {
            "status": "SUCCESS",
            "source": "Website",
            "url": url,
            "final_url": response.url,
            "title": title,
            "text": text,
            "links": all_urls,
            "images": images,
            "wallets": wallets,
            "wallet_count": len(wallets),
            "status_code": response.status_code,
            "content_type": content_type,
        }
        logger.info(
            "Website collection completed: %s | "
            "wallets=%s links=%s images=%s",
            url,
            len(wallets),
            len(all_urls),
            len(images),
        )
        return result
    async def collect_async(self, url):
        """
        Async wrapper used by CollectorManager.
        """
        return await asyncio.to_thread(
            self.collect,
            url,
        )
website_collector = WebsiteCollector()