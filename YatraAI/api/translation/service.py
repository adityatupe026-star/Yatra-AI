from __future__ import annotations

import html
import json
import logging
import os
from pathlib import Path
from threading import Lock
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

from .schemas import TranslateRequest


LOGGER = logging.getLogger(__name__)
_CACHE: dict[str, str] = {}
_CACHE_LOCK = Lock()


def _load_env_file() -> None:
    root = Path(__file__).resolve().parents[3]
    env_path = root / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_env_file()


def _google_translate_config() -> tuple[str, str]:
    return (
        os.getenv("GOOGLE_TRANSLATE_API_KEY", "").strip(),
        os.getenv(
            "GOOGLE_TRANSLATE_URL",
            "https://translation.googleapis.com/language/translate/v2",
        ).strip(),
    )


def _cache_key(text: str, target: str) -> str:
    return f"{text}|{target}"


def _call_google_translate(text: str, target: str) -> str:
    api_key, google_translate_url = _google_translate_config()
    if not api_key:
        raise ValueError("GOOGLE_TRANSLATE_API_KEY is not configured")

    params = {
        "key": api_key,
        "q": text,
        "target": target,
        "format": "text",
    }
    url = f"{google_translate_url}?{urlparse.urlencode(params)}"
    request = urlrequest.Request(url, method="POST")
    try:
        with urlrequest.urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
    except urlerror.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise ValueError(f"Google Translate HTTP {exc.code}: {body or exc.reason}") from exc

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
        LOGGER.warning(
            "Google Translate fallback used for target=%s (configured=%s): %s",
            payload.target,
            bool(os.getenv("GOOGLE_TRANSLATE_API_KEY", "").strip()),
            exc,
        )
    except Exception as exc:  # pragma: no cover - defensive fallback
        LOGGER.warning("Unexpected translation failure: %s", exc)
    raise RuntimeError("Translation unavailable")
