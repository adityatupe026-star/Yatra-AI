from __future__ import annotations

from fastapi import APIRouter

from .schemas import BookingConfirmRequest, BookingConfirmResponse, HotelSummaryRequest
from .service import confirm_booking, summarize_hotel


router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("/hotel-summary")
def hotel_summary(payload: HotelSummaryRequest) -> dict[str, str]:
    return {"summary": summarize_hotel(payload)}


@router.post("/confirm", response_model=BookingConfirmResponse)
def confirm(payload: BookingConfirmRequest) -> BookingConfirmResponse:
    return BookingConfirmResponse(**confirm_booking(payload))
