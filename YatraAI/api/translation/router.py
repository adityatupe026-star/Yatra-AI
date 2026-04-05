from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .schemas import TranslateRequest, TranslateResponse
from .service import translate_text


router = APIRouter(tags=["translation"])


@router.post("/translate", response_model=TranslateResponse)
@router.post("/api/translate", response_model=TranslateResponse, include_in_schema=False)
def translate(payload: TranslateRequest) -> TranslateResponse:
    try:
        translated = translate_text(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return TranslateResponse(translated=translated)
