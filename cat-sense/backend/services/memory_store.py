_store: dict = {}


def get(key: str):
    return _store.get(key)


def set(key: str, value) -> None:
    _store[key] = value


def delete(key: str) -> None:
    _store.pop(key, None)
