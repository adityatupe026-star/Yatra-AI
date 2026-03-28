# YatraAI Project README

## Overview

YatraAI is an India travel-planning project with three main parts:

1. a data-collection pipeline
2. a backend travel assistant engine powered by Ollama
3. a website frontend for discovery, planning, maps, chat, and history

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

Frontend README:

- [Frontend README](/D:/Yatraai/Frontend/README.md)

### [YatraAI](/D:/Yatraai/YatraAI)

Backend intelligence layer.

Contains:

- Python travel assistant engine
- dataset search logic
- Ollama integration

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

Expected main file:

- `places_dataset.csv`

## How The Whole Project Works

End-to-end flow:

1. collect tourism data using the data pipeline
2. save the cleaned dataset into `data/`
3. load that dataset in the Python backend
4. use Ollama to generate grounded travel responses
5. show those responses in the website frontend

## Current State

What is already present:

- data pipeline
- backend travel engine
- multi-page frontend
- Ollama-oriented local AI flow

What is still recommended for full production deployment:

- a proper backend API service
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
```

### 2. Run the backend engine

```powershell
python ".\YatraAI\YatraAi.py"
```

### 3. Serve the frontend

```powershell
cd .\Frontend
python -m http.server 5500
```

## Dependencies

Core dependencies currently listed in [requirements.txt](/D:/Yatraai/requirements.txt):

- `numpy`
- `pandas`
- `matplotlib`
- `seaborn`
- `scikit-learn`
- `notebook`
- `joblib`
- `ollama`

## Notes

- the backend currently works as a local engine, not a public API
- the frontend currently includes static seed data and browser-side state
- for public publishing, the clean next step is to connect the frontend to a real API layer
