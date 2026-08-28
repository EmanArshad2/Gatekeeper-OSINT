"""
X / Twitter Scraping Worker for Gatekeeper OSINT.
"""
import logging
from sqlalchemy.orm import Session
from app.database.models import Tweet
from app.core.wallet.detector import wallet_detector

logger = logging.getLogger(__name__)

class XScraperWorker:
    def process_tweet_text(self, tweet_id: str, author: str, text: str, db: Session) -> dict:
        wallets = wallet_detector.detect(text)

        tweet_record = db.query(Tweet).filter(Tweet.tweet_id == tweet_id).first()
        if not tweet_record:
            tweet_record = Tweet(
                tweet_id=tweet_id,
                author=author,
                text=text,
                wallet_count=len(wallets),
                processed=True,
            )
            db.add(tweet_record)
            db.commit()
            db.refresh(tweet_record)

        return {
            "tweet_id": tweet_id,
            "author": author,
            "text": text,
            "wallets": wallets,
            "wallet_count": len(wallets),
        }

x_scraper_worker = XScraperWorker()
