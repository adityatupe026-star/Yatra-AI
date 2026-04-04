from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from ..analytics import create_id, ensure_session, log_event, log_interaction, write_row
from ..engine import engine
from .schemas import BookingConfirmRequest, HotelSummaryRequest


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _module_code(module: str) -> str:
    compact = "".join(ch for ch in str(module or "").upper() if ch.isalnum())
    return (compact[:3] or "BKG").ljust(3, "X")


def _reference(module: str) -> str:
    return f"{_module_code(module)}-{uuid.uuid4().hex[:8].upper()}"


def _fallback_hotel_summary(hotel: Dict[str, Any], destination: str) -> str:
    name = hotel.get("name") or "Selected property"
    property_type = hotel.get("propertyType") or hotel.get("stayType") or "stay"
    stars = hotel.get("stars") or hotel.get("rating") or "strong"
    rooms = ", ".join(
        str(room.get("name") or room)
        for room in hotel.get("roomTypes", [])
        if room
    ) or "standard room, deluxe room and family suite"
    amenities = ", ".join(hotel.get("amenities", [])[:4]) or "WiFi, breakfast and central access"
    location = hotel.get("distanceLabel") or f"central in {destination or 'the destination'}"
    why = hotel.get("why") or "It gives the trip a practical balance of comfort and access."
    return (
        f"**{name} review summary**\n\n"
        f"- Rooms: {rooms}\n"
        f"- Food: breakfast and nearby dining options around {location}\n"
        f"- Staff: {property_type} service with {stars} star positioning and helpful on-ground support\n"
        f"- Location: {location}\n"
        f"- Cleanliness: {hotel.get('reviews', 'verified')} reviews and the listed amenities: {amenities}\n"
        f"- Overall: {why}"
    )


def summarize_hotel(payload: HotelSummaryRequest) -> str:
    hotel = dict(payload.hotel or {})
    destination = payload.destination or str(hotel.get("destination") or "")
    prompt = (
        "Write a concise hotel review summary grouped into rooms, food, staff, location and cleanliness. "
        "Keep it practical and grounded in the supplied hotel data. "
        "Use bullet-style sections and mention the property's strengths and any tradeoffs. "
        f"Hotel data: {json.dumps({'hotel': hotel, 'destination': destination}, ensure_ascii=False)}"
    )
    context = {"hotel": hotel, "destination": destination}
    if os.getenv("YATRA_USE_OLLAMA", "").lower() in {"1", "true", "yes"}:
        llm = engine._ollama_chat(prompt, context, response_mode="expert", max_tokens=1024)
        if llm:
            return llm
    return _fallback_hotel_summary(hotel, destination)


def confirm_booking(payload: BookingConfirmRequest) -> Dict[str, Any]:
    booking_id = create_id("booking")
    reference = _reference(payload.module)
    created_at = _now_iso()
    status = "CONFIRMED"
    summary = payload.summary.strip() or f"{payload.label} confirmed successfully."
    session_id = payload.sessionId or create_id("sess")
    ensure_session(
        session_id,
        source_page=payload.page or "bookings",
        device_type="web",
        platform="browser",
        app_version="1.0.0",
    )
    write_row(
        "bookings",
        {
            "booking_id": booking_id,
            "session_id": session_id,
            "query_id": payload.queryId or "",
            "module": payload.module,
            "label": payload.label,
            "summary": summary,
            "price": payload.price,
            "reference": reference,
            "status": status,
            "payload": json.dumps(payload.details, ensure_ascii=False),
            "created_at": created_at,
        },
    )
    log_interaction(
        session_id=session_id,
        query_id=payload.queryId or "",
        event_type="booking_confirmed",
        entity_type=payload.module,
        entity_value=payload.label,
        page=payload.page or "bookings",
        meta=reference,
    )
    log_event(
        event_type="booking_confirmed",
        page=payload.page or "bookings",
        session_id=session_id,
        prompt=payload.label,
        response=summary,
        text_length=len(payload.label),
        response_length=len(summary),
        notes=f"{payload.module}:{reference}",
    )
    return {
        "booking_id": booking_id,
        "reference": reference,
        "module": payload.module,
        "label": payload.label,
        "summary": summary,
        "price": payload.price,
        "status": status,
        "created_at": created_at,
        "details": payload.details,
    }
