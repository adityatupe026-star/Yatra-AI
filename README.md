# YatraAI Project README

## Overview

YatraAI is an India travel-planning project with four main parts:

1. a data-collection pipeline
2. a curated hackathon data pack
3. a backend travel assistant engine with a FastAPI layer
4. a website frontend for discovery, planning, maps, chat, and history

The project is structured so that travel recommendations are grounded in your own collected place data rather than relying only on raw model answers.

## Project Structure

```text
Yatraai/
  Frontend/
  YatraAI/
  Data collection/
  data/
  requirements.txt
  pipeline.log
```

## Folder Guide

### [Frontend](/D:/Yatraai/Frontend)

Website UI layer.

Contains:

- homepage
- destinations
- events
- planner
- AI chat
- explorer
- map
- history

Detailed feature guide:

- [Frontend README](/D:/Yatraai/Frontend/README.md)

### [YatraAI](/D:/Yatraai/YatraAI)

Backend intelligence layer.

Contains:

- Python travel assistant engine
- FastAPI API server
- dataset search logic
- optional Ollama integration

Backend README:

- [Backend README](/D:/Yatraai/YatraAI/README.md)

### [Data collection](/D:/Yatraai/Data%20collection)

Data ingestion pipeline.

Contains:

- collection from source APIs
- cleaning and enrichment
- output dataset generation

Data collection README:

- [Data Collection README](/D:/Yatraai/Data%20collection/README.md)

### [data](/D:/Yatraai/data)

Generated dataset output folder used by the backend.

Expected main folder:

- `hackathon/`

## How The Whole Project Works

End-to-end flow:

1. collect tourism data using the data pipeline
2. generate the curated hackathon pack into `data/hackathon/`
3. load that pack in the Python backend
4. optionally use Ollama to generate grounded travel responses
5. show those responses in the website frontend

## Current State

What is already present:

- data pipeline
- backend travel engine
- FastAPI API
- multi-page frontend
- Ollama-oriented local AI flow
- generated hackathon data pack

What is still recommended for full production deployment:

- secure Ollama proxying
- deployment configuration for frontend and backend
- optional database or managed JSON storage

## Installation

Install dependencies from the project root:

```powershell
pip install -r requirements.txt
```

## Recommended Run Order

### 1. Build the dataset

```powershell
python ".\Data collection\main.py"
node ".\YatraAI\build_data_pack.mjs"
```

### 2. Run the backend API

```powershell
uvicorn YatraAI.api.app:app --reload --port 8000
```

The backend serves the frontend from the same origin, so one server can handle both.

## Dependencies

Core dependencies currently listed in [requirements.txt](/D:/Yatraai/requirements.txt):

- `numpy`
- `pandas`
- `matplotlib`
- `seaborn`
- `scikit-learn`
- `notebook`
- `joblib`
- `fastapi`
- `uvicorn[standard]`
- `ollama`

## Notes

- the backend now includes a real API layer
- the frontend now points chat at the API first, with Ollama/demo fallback
- the clean next step is deployment wiring and secrets management if you host it publicly
