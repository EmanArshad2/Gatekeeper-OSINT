import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import requests
from dotenv import load_dotenv
# ============================================================
# Environment
# ============================================================
# Load backend .env
load_dotenv()
logger = logging.getLogger(__name__)
# ============================================================
# Local Wallet Intelligence Database
# ============================================================
DATA_FILE = Path(__file__).parent / "wallet_intelligence.json"
class IntelligenceProvider:
    """
    Provides locally stored wallet attribution and intelligence.
    wallet_intelligence.json is expected to contain records such as:
    {
        "0x742d...": {
            "entity_type": "Wallet",
            "organization": "Example Exchange",
            "country": "US",
            "tags": ["exchange", "high-risk"],
            "labels": ["known-service"],
            "sources": ["local_database"],
            "confidence": 90
        }
    }
    """
    def __init__(self):
        self.database: Dict[str, Dict[str, Any]] = {}
        self._load_database()
    # ========================================================
    # Load database
    # ========================================================
    def _load_database(self) -> None:
        """
        Load wallet intelligence from wallet_intelligence.json.
        """
        try:
            if not DATA_FILE.exists():
                logger.warning(
                    "Wallet intelligence database not found: %s",
                    DATA_FILE,
                )
                self.database = {}
                return
            with open(
                DATA_FILE,
                "r",
                encoding="utf-8",
            ) as file:
                data = json.load(file)
            if not isinstance(data, dict):
                logger.warning(
                    "Wallet intelligence database must contain a JSON object."
                )
                self.database = {}
                return
            self.database = data
            logger.info(
                "Loaded %s wallet intelligence records",
                len(self.database),
            )
        except json.JSONDecodeError as exc:
            logger.exception(
                "Invalid wallet intelligence JSON: %s",
                exc,
            )
            self.database = {}
        except Exception as exc:
            logger.exception(
                "Failed loading intelligence database: %s",
                exc,
            )
            self.database = {}
    # ========================================================
    # Lookup wallet
    # ========================================================
    def lookup_wallet(
        self,
        wallet: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Look up local intelligence for a wallet.
        Returns a normalized intelligence object even when
        no intelligence exists.
        """
        address = str(
            wallet.get("address", "")
        ).strip()
        if not address:
            return self._empty_intelligence()
        intelligence: Dict[str, Any] = {}
        # Direct lookup
        intelligence = self.database.get(
            address,
            {},
        )
        # Ethereum addresses are case-insensitive.
        if not intelligence:
            address_lower = address.lower()
            for (
                stored_address,
                stored_data,
            ) in self.database.items():
                if (
                    str(stored_address).lower()
                    == address_lower
                ):
                    if isinstance(
                        stored_data,
                        dict,
                    ):
                        intelligence = stored_data
                    break
        if not isinstance(
            intelligence,
            dict,
        ):
            intelligence = {}
        return {
            "entity_type": intelligence.get(
                "entity_type",
                "Wallet",
            ),
            "organization": intelligence.get(
                "organization",
            ),
            "country": intelligence.get(
                "country",
            ),
            "tags": self._ensure_list(
                intelligence.get(
                    "tags",
                    [],
                )
            ),
            "labels": self._ensure_list(
                intelligence.get(
                    "labels",
                    [],
                )
            ),
            "sources": self._ensure_list(
                intelligence.get(
                    "sources",
                    [],
                )
            ),
            "confidence": self._safe_int(
                intelligence.get(
                    "confidence",
                    0,
                )
            ),
        }
    # ========================================================
    # Convenience lookup
    # ========================================================
    def get_wallet_intelligence(
        self,
        address: str,
    ) -> Dict[str, Any]:
        """
        Convenience method for looking up intelligence
        directly from an Ethereum address.
        """
        return self.lookup_wallet(
            {
                "address": address,
            }
        )
    # ========================================================
    # Empty intelligence
    # ========================================================
    @staticmethod
    def _empty_intelligence() -> Dict[str, Any]:
        return {
            "entity_type": "Wallet",
            "organization": None,
            "country": None,
            "tags": [],
            "labels": [],
            "sources": [],
            "confidence": 0,
        }
    # ========================================================
    # Helpers
    # ========================================================
    @staticmethod
    def _ensure_list(
        value: Any,
    ) -> List[Any]:
        if isinstance(
            value,
            list,
        ):
            return value
        if value is None:
            return []
        return [value]
    @staticmethod
    def _safe_int(
        value: Any,
    ) -> int:
        try:
            return int(value)
        except (
            TypeError,
            ValueError,
        ):
            return 0
# ============================================================
# Etherscan Provider
# ============================================================
class EtherscanProvider:
    """
    Etherscan API provider for Ethereum wallet intelligence.
    This provider is used by:
        app/core/investigation/explorer.py
    Example:
        transactions = EtherscanProvider.get_transactions(
            address
        )
    """
    BASE_URL = (
        "https://api.etherscan.io/v2/api"
    )
    CHAIN_ID = "1"
    # These values are intentionally conservative because
    # investigation depth can multiply API requests quickly.
    DEFAULT_MAX_PAGES = 3
    DEFAULT_PAGE_SIZE = 100
    API_KEY: Optional[str] = os.getenv(
        "ETHERSCAN_API_KEY"
    )
    # ========================================================
    # API key
    # ========================================================
    @classmethod
    def _get_api_key(cls) -> Optional[str]:
        """
        Retrieve the Etherscan API key.
        Reading it at runtime makes the provider more reliable
        if environment variables are loaded after module import.
        """
        api_key = os.getenv(
            "ETHERSCAN_API_KEY"
        )
        if api_key:
            cls.API_KEY = api_key
        return cls.API_KEY
    @classmethod
    def _check_api_key(cls) -> bool:
        """
        Verify that the Etherscan API key exists.
        """
        api_key = cls._get_api_key()
        if not api_key:
            logger.error(
                "ETHERSCAN_API_KEY is missing from .env"
            )
            return False
        return True
    # ========================================================
    # Normalize address
    # ========================================================
    @staticmethod
    def _normalize_address(
        address: str,
    ) -> str:
        return str(
            address or ""
        ).strip()
    # ========================================================
    # Base request
    # ========================================================
    @classmethod
    def _request(
        cls,
        params: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Execute an Etherscan API request safely.
        """
        if not cls._check_api_key():
            return None
        try:
            api_key = cls._get_api_key()
            request_params = dict(params)
            request_params["apikey"] = api_key
            response = requests.get(
                cls.BASE_URL,
                params=request_params,
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()
            if not isinstance(
                data,
                dict,
            ):
                logger.warning(
                    "Unexpected Etherscan response type."
                )
                return None
            return data
        except requests.RequestException as exc:
            logger.exception(
                "Etherscan API request failed: %s",
                exc,
            )
        except ValueError as exc:
            logger.exception(
                "Invalid JSON returned by Etherscan: %s",
                exc,
            )
        except Exception as exc:
            logger.exception(
                "Unexpected Etherscan API error: %s",
                exc,
            )
        return None
    # ========================================================
    # Balance
    # ========================================================
    @classmethod
    def get_balance(
        cls,
        address: str,
    ) -> Optional[float]:
        """
        Retrieve the current ETH balance of a wallet.
        Returns:
            ETH balance as float
            None when lookup fails.
        """
        address = cls._normalize_address(
            address
        )
        if not address:
            return None
        data = cls._request(
            {
                "chainid": cls.CHAIN_ID,
                "module": "account",
                "action": "balance",
                "address": address,
                "tag": "latest",
            }
        )
        if not data:
            return None
        logger.info(
            "Etherscan balance response for %s: %s",
            address,
            data.get("message"),
        )
        status = str(
            data.get(
                "status",
                "",
            )
        )
        result = data.get(
            "result"
        )
        if status == "1":
            try:
                wei = int(
                    result or 0
                )
                return wei / 10**18
            except (
                TypeError,
                ValueError,
            ) as exc:
                logger.warning(
                    "Invalid balance value for %s: %s",
                    address,
                    exc,
                )
                return None
        logger.warning(
            "Etherscan balance lookup failed for %s: %s",
            address,
            result or data.get(
                "message",
                "Unknown error",
            ),
        )
        return None
    # ========================================================
    # Transactions
    # ========================================================
    @classmethod
    def get_transactions(
        cls,
        address: str,
        max_pages: int = DEFAULT_MAX_PAGES,
        page_size: int = DEFAULT_PAGE_SIZE,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve normal Ethereum transactions.
        This method intentionally keeps the same interface used
        by InvestigationExplorer.
        Example:
            transactions = EtherscanProvider.get_transactions(
                address
            )
        Parameters:
            address:
                Ethereum wallet address.
            max_pages:
                Maximum number of Etherscan pages.
            page_size:
                Number of transactions per page.
        Returns:
            List of transaction dictionaries.
        """
        address = cls._normalize_address(
            address
        )
        if not address:
            logger.warning(
                "Transaction lookup requested without address."
            )
            return []
        if not cls._check_api_key():
            return []
        # Protect the API from accidental huge requests.
        max_pages = max(
            1,
            min(
                int(max_pages),
                10,
            ),
        )
        page_size = max(
            1,
            min(
                int(page_size),
                100,
            ),
        )
        transactions: List[
            Dict[str, Any]
        ] = []
        seen_hashes = set()
        try:
            for page in range(
                1,
                max_pages + 1,
            ):
                data = cls._request(
                    {
                        "chainid": cls.CHAIN_ID,
                        "module": "account",
                        "action": "txlist",
                        "address": address,
                        "startblock": 0,
                        "endblock": 99999999,
                        "page": page,
                        "offset": page_size,
                        "sort": "asc",
                    }
                )
                if not data:
                    break
                status = str(
                    data.get(
                        "status",
                        "",
                    )
                )
                result = data.get(
                    "result"
                )
                message = data.get(
                    "message",
                    "",
                )
                # =================================================
                # Empty wallet
                # =================================================
                if (
                    isinstance(
                        result,
                        str,
                    )
                    and (
                        "No transactions"
                        in result
                    )
                ):
                    logger.info(
                        "No transactions found for %s",
                        address,
                    )
                    break
                # =================================================
                # API error
                # =================================================
                if status != "1":
                    logger.warning(
                        "Etherscan transaction lookup failed "
                        "for %s: %s",
                        address,
                        message or result,
                    )
                    break
                # =================================================
                # Validate result
                # =================================================
                if not isinstance(
                    result,
                    list,
                ):
                    logger.warning(
                        "Unexpected Etherscan transaction "
                        "result for %s",
                        address,
                    )
                    break
                # =================================================
                # Add unique transactions
                # =================================================
                page_count = 0
                for transaction in result:
                    if not isinstance(
                        transaction,
                        dict,
                    ):
                        continue
                    tx_hash = str(
                        transaction.get(
                            "hash",
                            "",
                        )
                    ).strip()
                    # Avoid duplicates across pages.
                    if tx_hash:
                        if tx_hash in seen_hashes:
                            continue
                        seen_hashes.add(
                            tx_hash
                        )
                    transactions.append(
                        transaction
                    )
                    page_count += 1
                logger.info(
                    "Page %s: retrieved %s unique transactions "
                    "for %s",
                    page,
                    page_count,
                    address,
                )
                # =================================================
                # Last page
                # =================================================
                if len(result) < page_size:
                    break
            logger.info(
                "Retrieved %s total transactions for %s",
                len(transactions),
                address,
            )
            return transactions
        except (
            TypeError,
            ValueError,
        ) as exc:
            logger.exception(
                "Invalid transaction configuration for %s: %s",
                address,
                exc,
            )
        except Exception as exc:
            logger.exception(
                "Etherscan transaction lookup failed "
                "for %s: %s",
                address,
                exc,
            )
        return []
    # ========================================================
    # Latest transactions
    # ========================================================
    @classmethod
    def get_latest_transactions(
        cls,
        address: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Convenience method for investigation.
        Retrieves transactions and returns only the newest
        requested number.
        """
        limit = max(
            1,
            min(
                int(limit),
                100,
            ),
        )
        transactions = cls.get_transactions(
            address,
            max_pages=1,
            page_size=limit,
        )
        return transactions[-limit:]
    # ========================================================
    # Wallet summary
    # ========================================================
    @classmethod
    def get_wallet_summary(
        cls,
        address: str,
    ) -> Dict[str, Any]:
        """
        Retrieve basic Ethereum wallet intelligence.
        Used for enriching investigation nodes.
        """
        address = cls._normalize_address(
            address
        )
        transactions = cls.get_latest_transactions(
            address,
            limit=100,
        )
        balance = cls.get_balance(
            address
        )
        return {
            "address": address,
            "chain": "ethereum",
            "balance": balance,
            "transaction_count": len(
                transactions
            ),
            "transactions": transactions,
        }
# ============================================================
# Provider Instances
# ============================================================
intelligence_provider = IntelligenceProvider()