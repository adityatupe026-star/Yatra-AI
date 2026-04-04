from __future__ import annotations

from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1)
    target: str = Field(min_length=1)


class TranslateResponse(BaseModel):
    translated: str
