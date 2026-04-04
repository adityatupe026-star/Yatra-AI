from __future__ import annotations

import json
import logging
import os
from threading import Lock
from urllib import error as urlerror
from urllib import request as urlrequest

from .schemas import TranslateRequest


LOGGER = logging.getLogger(__name__)
LIBRETRANSLATE_URL = os.getenv("LIBRETRANSLATE_URL", "http://localhost:5001/translate")
_CACHE: dict[str, str] = {}
_CACHE_LOCK = Lock()


def _cache_key(text: str, target: str) -> str:
    return f"{text}|{target}"


def _call_libretranslate(text: str, target: str) -> str:
    payload = {
        "q": text,
        "source": "auto",
        "target": target,
        "format": "text",
    }
    request = urlrequest.Request(
        LIBRETRANSLATE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urlrequest.urlopen(request, timeout=3) as response:
        raw = response.read().decode("utf-8")

    data = json.loads(raw)
    translated = data.get("translatedText")
    if not isinstance(translated, str) or not translated.strip():
        raise ValueError("Invalid LibreTranslate response")
    return translated


def translate_text(payload: TranslateRequest) -> str:
    cache_key = _cache_key(payload.text, payload.target)
    with _CACHE_LOCK:
        cached = _CACHE.get(cache_key)
    if cached is not None:
        return cached

    try:
        translated = _call_libretranslate(payload.text, payload.target)
        with _CACHE_LOCK:
            _CACHE[cache_key] = translated
        return translated
    except (TimeoutError, urlerror.URLError, json.JSONDecodeError, ValueError) as exc:
        LOGGER.warning("LibreTranslate fallback used: %s", exc)
    except Exception as exc:  # pragma: no cover - defensive fallback
        LOGGER.warning("Unexpected translation failure: %s", exc)
    return payload.text
