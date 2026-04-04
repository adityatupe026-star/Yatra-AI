# YatraAI Backend README

This folder contains the backend intelligence layer for YatraAI.

It includes:

- the local assistant engine in [yatra_ai.py](/D:/Yatraai/YatraAI/yatra_ai.py)
- the FastAPI service in [api/app.py](/D:/Yatraai/YatraAI/api/app.py)
- CSV analytics helpers in [api/analytics.py](/D:/Yatraai/YatraAI/api/analytics.py)
- the tourism dashboard in [dev_dashboard.py](/D:/Yatraai/YatraAI/dev_dashboard.py)

## What The Backend Does

The backend:

- loads the curated tourism data pack
- searches destinations and places
- builds planner responses
- handles trip-aware and expert chat modes
- proxies translation requests
- writes structured CSV logs
- serves the frontend from the same origin

## Data Sources

The generated tourism pack lives in:

```text
D:\Yatraai\data\hackathon
```

It contains:

- `destinations.json`
- `itineraries.json`
- `local_intelligence.json`
- `cost_benchmarks.json`
- `manifest.json`

The dashboard also reads:

- `data/places_dataset.csv`
- `data/hackathon/*.json`

## Main Files

### [yatra_ai.py](/D:/Yatraai/YatraAI/yatra_ai.py)

Local assistant script with dataset loading, recommendation logic, and offline chat flow.

### [api/app.py](/D:/Yatraai/YatraAI/api/app.py)

FastAPI entry point that exposes:

- `GET /health`
- `GET /api/manifest`
- `GET /api/place/{name}`
- `GET /api/nearby/{name}`
- `GET /api/search`
- `POST /api/recommend`
- `POST /api/plan`
- `POST /api/optimize`
- `POST /api/simulate`
- `POST /api/chat`
- `POST /translate`
- `POST /api/translate`

### [api/analytics.py](/D:/Yatraai/YatraAI/api/analytics.py)

CSV logger and table schema helpers for:

- sessions
- queries
- intent parses
- recommendations
- interactions
- conversions
- translations
- chat messages
- events

### [api/translation/](/D:/Yatraai/YatraAI/api/translation/)

Google Cloud Translation-backed translation module with request models, caching, and router wiring.

### [dev_dashboard.py](/D:/Yatraai/YatraAI/dev_dashboard.py)

Streamlit dashboard for India tourism analysis.

## Architecture

The backend flow is:

1. load the tourism datasets
2. detect user intent
3. build grounded travel responses
4. log usage to CSV
5. return the result to the frontend or dashboard

## Running The API

From the repo root:

```powershell
uvicorn YatraAI.api.app:app --reload --port 8000
```

Copy `.env.example` to `.env` and set `GOOGLE_TRANSLATE_API_KEY` before using translation.

## Notes

- The backend supports India-wide tourism analysis.
- The dashboard is separate from app telemetry.
- The translate endpoint falls back to the original text if Google Translate is unavailable or misconfigured.
- Ollama can still be enabled through environment settings when needed.
