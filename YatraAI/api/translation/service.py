from __future__ import annotations

import html
import json
import logging
import os
from threading import Lock
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

from .schemas import TranslateRequest


LOGGER = logging.getLogger(__name__)
GOOGLE_TRANSLATE_API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY", "").strip()
GOOGLE_TRANSLATE_URL = os.getenv(
    "GOOGLE_TRANSLATE_URL",
    "https://translation.googleapis.com/language/translate/v2",
).strip()
_CACHE: dict[str, str] = {}
_CACHE_LOCK = Lock()


def _cache_key(text: str, target: str) -> str:
    return f"{text}|{target}"


def _call_google_translate(text: str, target: str) -> str:
    if not GOOGLE_TRANSLATE_API_KEY:
        raise ValueError("GOOGLE_TRANSLATE_API_KEY is not configured")

    payload = {
        "q": text,
        "source": "auto",
        "target": target,
        "format": "text",
    }
    url = f"{GOOGLE_TRANSLATE_URL}?{urlparse.urlencode({'key': GOOGLE_TRANSLATE_API_KEY})}"
    request = urlrequest.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urlrequest.urlopen(request, timeout=3) as response:
        raw = response.read().decode("utf-8")

    data = json.loads(raw)
    translations = data.get("data", {}).get("translations", [])
    if not translations:
        raise ValueError("Invalid Google Translate response")
    translated = translations[0].get("translatedText")
    if not isinstance(translated, str) or not translated.strip():
        raise ValueError("Invalid Google Translate response")
    return html.unescape(translated)


def translate_text(payload: TranslateRequest) -> str:
    cache_key = _cache_key(payload.text, payload.target)
    with _CACHE_LOCK:
        cached = _CACHE.get(cache_key)
    if cached is not None:
        return cached

    try:
        translated = _call_google_translate(payload.text, payload.target)
        with _CACHE_LOCK:
            _CACHE[cache_key] = translated
        return translated
    except (TimeoutError, urlerror.URLError, json.JSONDecodeError, ValueError) as exc:
        LOGGER.warning("Google Translate fallback used: %s", exc)
    except Exception as exc:  # pragma: no cover - defensive fallback
        LOGGER.warning("Unexpected translation failure: %s", exc)
    return payload.text
