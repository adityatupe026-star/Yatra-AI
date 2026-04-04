from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .analytics import (
    ensure_session,
    create_id,
    log_chat_message,
    log_event,
    log_intent_parse,
    log_interaction,
    log_query,
    log_recommendation,
    log_translation,
)
from .engine import engine
from .schemas import ChatRequest, OptimizeRequest, PlanRequest, RecommendRequest, SimulateRequest
from .translation.router import router as translation_router


ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = ROOT / "Frontend"

app = FastAPI(title="YatraAI", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(translation_router)


@app.get("/health")
@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", **engine.manifest_summary()}


@app.get("/api/manifest")
def manifest() -> Dict[str, Any]:
    return engine.manifest_summary()


@app.get("/api/search")
def search(q: str, limit: int = 6) -> Dict[str, Any]:
    return {"query": q, "results": engine.search_destinations(q, limit=limit)}


@app.get("/api/place/{name}")
def place(name: str) -> Dict[str, Any]:
    payload = engine.place_payload(name)
    if not payload.get("found"):
        raise HTTPException(status_code=404, detail="Place not found")
    return payload


@app.get("/api/nearby/{name}")
def nearby(name: str, limit: int = 6) -> Dict[str, Any]:
    return {"anchor": name, "results": engine.nearby_places(name, limit=limit)}


@app.post("/api/recommend")
def recommend(payload: RecommendRequest) -> Dict[str, Any]:
    return {"results": engine.recommend(payload.interests, payload.budget, payload.limit, payload.region, payload.exclude)}


@app.post("/api/plan")
def plan(payload: PlanRequest) -> Dict[str, Any]:
    try:
        result = engine.plan_trip(payload.model_dump())
    except Exception as exc:  # pragma: no cover - validation layer
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    session_id = create_id("plan")
    ensure_session(session_id, source_page="planner", device_type="web", platform="browser", app_version="1.0.0")
    query = log_query(
        session_id=session_id,
        query_type="planner",
        raw_query=f"{payload.start} to {payload.destination}",
        source="planner_form",
        page="planner",
        language="",
        trip_mode="trip",
        destination_hint=payload.destination,
        budget_hint=payload.budget,
        days_hint=payload.days,
    )
    log_intent_parse(
        query_id=query["query_id"],
        session_id=session_id,
        destination=payload.destination,
        start_city=payload.start,
        budget=payload.budget,
        days=payload.days,
        travel_type=payload.vibe,
        mood=payload.stayPreference,
        preferences=payload.interests,
        language_target="",
        confidence=0.84,
    )
    log_recommendation(
        query_id=query["query_id"],
        session_id=session_id,
        recommendation_type="plan",
        top_pick=result["destination"]["name"],
        all_picks=[result["destination"]["name"], *(item.get("name", "") for item in result.get("nearby", [])[:4])],
        estimated_cost=result.get("budget", {}).get("total", {}).get("low", ""),
        estimated_days=result.get("days", ""),
        ai_mode="trip",
    )
    log_interaction(
        session_id=session_id,
        query_id=query["query_id"],
        event_type="generate_plan",
        entity_type="plan",
        entity_value=result["destination"]["name"],
        page="planner",
        meta=f"{payload.mode}|{payload.vibe}",
    )
    log_event(
        event_type="plan",
        page="planner",
        session_id=session_id,
        start=payload.start,
        destination=payload.destination,
        travel_mode=payload.mode,
        prompt=f"{payload.start} to {payload.destination}",
        response=result.get("summary", ""),
        text_length=len(payload.destination),
        response_length=len(str(result)),
        notes="Planner route generated.",
    )
    return result


@app.post("/api/optimize")
def optimize(payload: OptimizeRequest) -> Dict[str, Any]:
    return engine.optimize_plan(payload.model_dump())


@app.post("/api/simulate")
def simulate(payload: SimulateRequest) -> Dict[str, Any]:
    return engine.simulate_trip(payload.model_dump())


@app.post("/api/chat")
def chat(payload: ChatRequest) -> Dict[str, Any]:
    result = engine.chat(payload.prompt, payload.context, payload.responseMode)
    if payload.model:
        result["model"] = payload.model
    session_id = str(payload.context.get("sessionId") or create_id("chat"))
    ensure_session(session_id, source_page="chat", device_type="web", platform="browser", app_version="1.0.0")
    trip = payload.context.get("trip") if isinstance(payload.context.get("trip"), dict) else {}
    destination_hint = ""
    if isinstance(trip, dict):
        destination_data = trip.get("destination") or trip.get("place") or {}
        if isinstance(destination_data, dict):
            destination_hint = destination_data.get("name", "")
    query = log_query(
        session_id=session_id,
        query_type="chat",
        raw_query=payload.prompt,
        source="chat_input",
        page="chat",
        language="en-IN",
        trip_mode=payload.responseMode,
        destination_hint=destination_hint,
        budget_hint="",
        days_hint="",
    )
    log_chat_message(
        session_id=session_id,
        query_id=query["query_id"],
        role="user",
        message_text=payload.prompt,
        response_mode=payload.responseMode,
        intent="user_prompt",
    )
    log_chat_message(
        session_id=session_id,
        query_id=query["query_id"],
        role="assistant",
        message_text=result.get("response", ""),
        response_mode=payload.responseMode,
        intent=result.get("intent", "general"),
    )
    log_recommendation(
        query_id=query["query_id"],
        session_id=session_id,
        recommendation_type="chat_answer",
        top_pick=result.get("place", {}).get("name", "") if isinstance(result.get("place"), dict) else "",
        all_picks=[result.get("place", {}).get("name", "")] if isinstance(result.get("place"), dict) else [],
        estimated_cost="",
        estimated_days="",
        ai_mode=payload.responseMode,
    )
    log_event(
        event_type="chat",
        page="chat",
        session_id=session_id,
        context_mode=payload.responseMode,
        prompt=payload.prompt,
        response=result.get("response", ""),
        text_length=len(payload.prompt),
        response_length=len(result.get("response", "")),
        notes="Trip context enabled." if payload.responseMode == "trip" else "Travel expert mode.",
    )
    return result


@app.get("/api/share/{token}")
def share(token: str) -> Dict[str, Any]:
    try:
        padded = token + "=" * (-len(token) % 4)
        decoded = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
    except Exception:
        decoded = None
    return {"token": token, "decoded": decoded}


if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
