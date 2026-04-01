from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .engine import engine
from .schemas import ChatRequest, OptimizeRequest, PlanRequest, RecommendRequest, SimulateRequest


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
        return engine.plan_trip(payload.model_dump())
    except Exception as exc:  # pragma: no cover - validation layer
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/optimize")
def optimize(payload: OptimizeRequest) -> Dict[str, Any]:
    return engine.optimize_plan(payload.model_dump())


@app.post("/api/simulate")
def simulate(payload: SimulateRequest) -> Dict[str, Any]:
    return engine.simulate_trip(payload.model_dump())


@app.post("/api/chat")
def chat(payload: ChatRequest) -> Dict[str, Any]:
    result = engine.chat(payload.prompt, payload.context)
    if payload.model:
        result["model"] = payload.model
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
