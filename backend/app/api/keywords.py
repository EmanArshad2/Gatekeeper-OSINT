from fastapi import APIRouter
router = APIRouter(
    prefix="/keywords",
    tags=["Keywords"],
)
# Default intelligence keywords
KEYWORDS = [
    "wallet",
    "btc",
    "bitcoin",
    "eth",
    "ethereum",
    "usdt",
    "usdc",
    "trc20",
    "erc20",
    "address",
    "send",
    "receive",
    "transfer",
    "crypto",
    "cryptocurrency",
    "transaction",
    "tx",
    "deposit",
    "withdraw",
    "exchange",
    "binance",
    "bybit",
    "okx",
    "tether",
    "seed",
    "mnemonic",
    "private key",
    "recovery phrase",
    "qr",
    "scan",
]
@router.get("")
def get_keywords():
    return {
        "status": "SUCCESS",
        "keywords": KEYWORDS,
    }