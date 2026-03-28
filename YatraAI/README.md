# YatraAI Backend README

## Overview

This folder contains the backend intelligence layer for YatraAI.

Today, the backend is a local Python assistant engine in [YatraAi.py](/D:/Yatraai/YatraAI/YatraAi.py). It is not yet a full web API server, but it already contains the core travel-planning logic that the website can use through a future API wrapper.

The backend combines:

- structured travel data from the generated CSV dataset
- deterministic search and recommendation logic in Python
- Ollama for local LLM responses

## What This Backend Does

The backend is responsible for:

- loading the cleaned places dataset
- searching places by name and keywords
- filtering recommendations by interests and budget
- generating nearby recommendations using coordinates
- building itinerary-style answers
- producing place overviews
- handling transport-style questions
- handling emergency and hospital lookup flows
- calling Ollama to turn structured context into natural responses

## Main File

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

## Current Architecture

Current backend shape:

1. Load `places_dataset.csv`
2. Normalize and prepare searchable fields
3. Detect user intent and preferences
4. Collect matching records from the dataset
5. Send grounded context to Ollama
6. Return a travel response

Important note:

- this folder currently contains the travel engine
- it does not yet expose FastAPI/Flask endpoints
- if you want public website deployment, the next backend step is to wrap this logic in an API service

## Dataset Dependency

Default dataset path:

```text
D:\Yatraai\data\places_dataset.csv
```

The code resolves it from:

```python
DATASET_DEFAULT = Path(__file__).resolve().parents[1] / "data" / "places_dataset.csv"
```

You can override it with:

```text
YATRA_DATASET
```

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

From the project root:

```powershell
python .\YatraAI\YatraAi.py
```

Make sure:

- the dataset exists in `data/places_dataset.csv`
- Ollama is installed and running
- the selected model is available locally

## Recommended Next Step For Web Publishing

To make this backend website-ready, add an API layer such as:

- FastAPI
- Flask

Recommended API endpoints:

- `POST /api/chat`
- `POST /api/plan`
- `GET /api/place/{name}`
- `GET /api/nearby/{name}`

Then connect the frontend to that API instead of directly relying on mock/demo logic.
