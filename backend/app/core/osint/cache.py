from datetime import datetime, timedelta
_cache = {}
CACHE_TIME = timedelta(minutes=10)
def get(key):
    value = _cache.get(key)
    if not value:
        return None
    if datetime.utcnow() > value["expires"]:
        del _cache[key]
        return None
    return value["data"]
def set(key, data):
    _cache[key] = {
        "data": data,
        "expires": datetime.utcnow() + CACHE_TIME
    }