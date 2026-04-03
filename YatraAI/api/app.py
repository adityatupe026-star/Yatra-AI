from __future__ import annotations

import base64
import html
import json
import os
from pathlib import Path
from typing import Any, Dict
from urllib import error as urlerror
from urllib import request as urlrequest

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .engine import engine
from .schemas import ChatRequest, OptimizeRequest, PlanRequest, RecommendRequest, SimulateRequest, TranslateRequest


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


@app.post("/api/translate")
def translate(payload: TranslateRequest) -> Dict[str, Any]:
    api_key = os.environ.get("GOOGLE_TRANSLATE_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="Set GOOGLE_TRANSLATE_API_KEY on the backend to enable Google Translate.")

    endpoint = os.environ.get("GOOGLE_TRANSLATE_API_URL", "https://translation.googleapis.com/language/translate/v2").strip()
    request_payload: Dict[str, Any] = {
        "q": payload.text,
        "target": payload.targetLanguage,
        "format": "text",
    }
    if payload.sourceLanguage and payload.sourceLanguage != "auto":
        request_payload["source"] = payload.sourceLanguage

    req = urlrequest.Request(
        f"{endpoint}?key={api_key}",
        data=json.dumps(request_payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urlerror.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else str(exc)
        raise HTTPException(status_code=502, detail=f"Google Translate error: {detail}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Google Translate request failed: {exc}") from exc

    translations = data.get("data", {}).get("translations", [])
    first = translations[0] if translations else {}
    return {
        "translatedText": html.unescape(first.get("translatedText", "")),
        "detectedSourceLanguage": first.get("detectedSourceLanguage"),
        "targetLanguage": payload.targetLanguage,
        "provider": "Google Cloud Translation",
    }


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
