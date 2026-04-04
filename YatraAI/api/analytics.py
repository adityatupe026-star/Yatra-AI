from __future__ import annotations

import csv
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Mapping


ROOT = Path(__file__).resolve().parents[2]
ANALYTICS_DIR = ROOT / "data" / "analytics"

TABLE_SCHEMAS: dict[str, list[str]] = {
    "events": [
        "timestamp",
        "event_type",
        "page",
        "session_id",
        "context_mode",
        "prompt",
        "response",
        "start",
        "destination",
        "travel_mode",
        "source_language",
        "target_language",
        "text_length",
        "response_length",
        "notes",
    ],
    "sessions": [
        "session_id",
        "user_id",
        "started_at",
        "ended_at",
        "device_type",
        "platform",
        "source_page",
        "country",
        "city",
        "app_version",
    ],
    "queries": [
        "query_id",
        "session_id",
        "user_id",
        "query_type",
        "raw_query",
        "source",
        "page",
        "timestamp",
        "language",
        "trip_mode",
        "destination_hint",
        "budget_hint",
        "days_hint",
    ],
    "intent_parses": [
        "intent_id",
        "query_id",
        "session_id",
        "destination",
        "start_city",
        "budget",
        "days",
        "travel_type",
        "mood",
        "preferences",
        "language_target",
        "confidence",
        "parsed_at",
    ],
    "recommendations": [
        "rec_id",
        "query_id",
        "session_id",
        "recommendation_type",
        "top_pick",
        "all_picks",
        "estimated_cost",
        "estimated_days",
        "ai_mode",
        "created_at",
    ],
    "interactions": [
        "interaction_id",
        "session_id",
        "query_id",
        "event_type",
        "entity_type",
        "entity_value",
        "timestamp",
        "page",
        "meta",
    ],
    "conversions": [
        "conversion_id",
        "session_id",
        "query_id",
        "converted",
        "conversion_type",
        "final_destination",
        "final_budget",
        "final_days",
        "feedback_score",
        "feedback_text",
        "converted_at",
    ],
    "translations": [
        "translation_id",
        "session_id",
        "query_id",
        "source_language",
        "target_language",
        "input_text",
        "translated_text",
        "provider",
        "used_speech_output",
        "copied",
        "timestamp",
    ],
    "chat_messages": [
        "message_id",
        "session_id",
        "query_id",
        "role",
        "message_text",
        "response_mode",
        "intent",
        "timestamp",
    ],
}

TABLE_FILES: dict[str, Path] = {name: ANALYTICS_DIR / f"{name}.csv" for name in TABLE_SCHEMAS}
_LOCK = threading.Lock()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _clean(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value).replace("\r", " ").replace("\n", " ").strip()


def ensure_tables() -> None:
    ANALYTICS_DIR.mkdir(parents=True, exist_ok=True)
    for table, path in TABLE_FILES.items():
        if not path.exists():
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=TABLE_SCHEMAS[table])
                writer.writeheader()


def write_row(table: str, row: Mapping[str, Any]) -> Dict[str, str]:
    if table not in TABLE_SCHEMAS:
        raise KeyError(f"Unknown analytics table: {table}")
    ensure_tables()
    schema = TABLE_SCHEMAS[table]
    normalized = {field: _clean(row.get(field)) for field in schema}
    with _LOCK:
        path = TABLE_FILES[table]
        file_exists = path.exists() and path.stat().st_size > 0
        with path.open("a", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=schema)
            if not file_exists:
                writer.writeheader()
            writer.writerow(normalized)
    return normalized


def read_table(table: str) -> Iterable[Dict[str, str]]:
    path = TABLE_FILES.get(table)
    if path is None or not path.exists():
        return []
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def log_event(**data: Any) -> Dict[str, str]:
    payload = dict(data)
    payload.setdefault("timestamp", now_iso())
    return write_row("events", payload)


def log_session(**data: Any) -> Dict[str, str]:
    payload = dict(data)
    payload.setdefault("session_id", create_id("sess"))
    payload.setdefault("started_at", now_iso())
    return write_row("sessions", payload)


def ensure_session(session_id: str, **data: Any) -> Dict[str, str]:
    ensure_tables()
    if not session_id:
        return log_session(**data)
    path = TABLE_FILES["sessions"]
    if path.exists():
        with path.open("r", newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                if row.get("session_id") == session_id:
                    return row
    payload = dict(data)
    payload["session_id"] = session_id
    return log_session(**payload)


def log_query(**data: Any) -> Dict[str, str]:
    payload = dict(data)
    payload.setdefault("query_id", create_id("query"))
    payload.setdefault("timestamp", now_iso())
    return write_row("queries", payload)


def log_intent_parse(**data: Any) -> Dict[str, str]:
    payload = dict(data)
    payload.setdefault("intent_id", create_id("intent"))
    payload.setdefault("parsed_at", now_iso())
    if "preferences" in payload and isinstance(payload["preferences"], (list, tuple, set)):
        payload["preferences"] = ", ".join(str(item) for item in payload["preferences"])
    return write_row("intent_parses", payload)


def log_recommendation(**data: Any) -> Dict[str, str]:
    payload = dict(data)
    payload.setdefault("rec_id", create_id("rec"))
    payload.setdefault("created_at", now_iso())
    if "all_picks" in payload and isinstance(payload["all_picks"], (list, tuple, set)):
        payload["all_picks"] = " | ".join(str(item) for item in payload["all_picks"])
    return write_row("recommendations", payload)


def log_interaction(**data: Any) -> Dict[str, str]:
    payload = dict(data)
    payload.setdefault("interaction_id", create_id("interaction"))
    payload.setdefault("timestamp", now_iso())
    return write_row("interactions", payload)


def log_conversion(**data: Any) -> Dict[str, str]:
    payload = dict(data)
    payload.setdefault("conversion_id", create_id("conversion"))
    payload.setdefault("converted_at", now_iso())
    return write_row("conversions", payload)


def log_translation(**data: Any) -> Dict[str, str]:
    payload = dict(data)
    payload.setdefault("translation_id", create_id("translation"))
    payload.setdefault("timestamp", now_iso())
    return write_row("translations", payload)


def log_chat_message(**data: Any) -> Dict[str, str]:
    payload = dict(data)
    payload.setdefault("message_id", create_id("msg"))
    payload.setdefault("timestamp", now_iso())
    return write_row("chat_messages", payload)


def ensure_all_tables() -> None:
    ensure_tables()
