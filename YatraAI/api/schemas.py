from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    prompt: str
    model: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)


class RecommendRequest(BaseModel):
    interests: List[str] = Field(default_factory=list)
    budget: Optional[int] = None
    limit: int = 6
    region: Optional[str] = None
    exclude: List[str] = Field(default_factory=list)


class PlanRequest(BaseModel):
    start: str
    destination: str
    days: int = 3
    budget: int = 12000
    mode: str = "Road"
    stayPreference: str = "flexible"
    vibe: str = "balanced"
    interests: List[str] = Field(default_factory=list)
    nearbyFocus: str = ""
    visitFocus: str = ""
    restaurantName: str = ""
    tripStops: List[str] = Field(default_factory=list)


class OptimizeRequest(BaseModel):
    plan: Dict[str, Any]
    objective: str = "balance"


class SimulateRequest(BaseModel):
    plan: Dict[str, Any]


class TranslateRequest(BaseModel):
    text: str
    targetLanguage: str
    sourceLanguage: Optional[str] = None
