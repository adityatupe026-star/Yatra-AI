# YatraAI Backend README

## Overview

This folder contains the backend intelligence layer for YatraAI.

It now includes both:

- the original local assistant engine in [YatraAi.py](/D:/Yatraai/YatraAI/YatraAi.py)
- a FastAPI service in [api/app.py](/D:/Yatraai/YatraAI/api/app.py)

The backend combines:

- structured travel data from the generated hackathon data pack
- deterministic search and recommendation logic in Python
- optional Ollama responses when `YATRA_USE_OLLAMA=1`

## What This Backend Does

The backend is responsible for:

- loading the curated destination, itinerary, intel and cost JSON files
- searching places by name, state, tags and highlights
- filtering recommendations by interests, region and budget
- generating nearby recommendations using coordinates
- building itinerary-style answers
- producing place overviews
- handling transport, weather, packing, budget and optimization questions
- calling Ollama when available and requested

## Main Files

### [YatraAi.py](/D:/Yatraai/YatraAI/YatraAi.py)

This file includes:

- dataset loading and normalization
- user profile tracking
- place search utilities
- recommendation logic
- nearby place lookup with Haversine distance
- emergency place search
- LLM prompt construction
- interactive local chat flow

### [api/app.py](/D:/Yatraai/YatraAI/api/app.py)

This is the web server entry point. It exposes:

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

It also serves the frontend from the same server so the site and API can run on one origin.

## Current Architecture

Current backend shape:

1. Generate the curated data pack from the frontend dataset
2. Load destination, itinerary, local intelligence and cost data
3. Detect user intent and preferences
4. Collect matching records from the dataset
5. Return a grounded travel response from the API or local engine

## Dataset Dependency

Generated data pack path:

```text
D:\Yatraai\data\hackathon
```

The pack is generated from the frontend data files and contains:

- `destinations.json`
- `itineraries.json`
- `local_intelligence.json`
- `cost_benchmarks.json`
- `manifest.json`

## Ollama Dependency

The backend uses local Ollama inference through the Python `ollama` package.

Default model:

```text
llama3.2
```

Override with:

```text
OLLAMA_MODEL
```

Enable Ollama inside the FastAPI engine with:

```text
YATRA_USE_OLLAMA=1
```

## Key Internal Components

### `PlacesDB`

Main data access class. It handles:

- interest detection
- budget filtering
- text search
- recommendations
- nearby-place queries
- emergency-place lookup

### `UserProfile`

Tracks travel preferences across the session, including:

- budget
- interests
- travel type

## How To Run

Generate the data pack:

```powershell
node .\YatraAI\build_data_pack.mjs
```

Run the API:

```powershell
uvicorn YatraAI.api.app:app --reload --port 8000
```

If you want the original offline assistant script, you can still run:

```powershell
python .\YatraAI\YatraAi.py
```
