from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class HotelSummaryRequest(BaseModel):
    hotel: Dict[str, Any] = Field(default_factory=dict)
    destination: str = ""


class BookingConfirmRequest(BaseModel):
    module: str
    label: str
    summary: str = ""
    price: int = 0
    details: Dict[str, Any] = Field(default_factory=dict)
    sessionId: Optional[str] = None
    queryId: Optional[str] = None
    page: str = "bookings"


class BookingConfirmResponse(BaseModel):
    booking_id: str
    reference: str
    module: str
    label: str
    summary: str
    price: int
    status: str
    created_at: str
    details: Dict[str, Any]

