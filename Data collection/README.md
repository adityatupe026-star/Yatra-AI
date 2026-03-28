# YatraAI Data Collection README

## Overview

This folder contains the data-ingestion pipeline for YatraAI.

Its job is to collect tourism and travel-support place data, clean and normalize it, enrich it with assistant-friendly fields, and save the final dataset used by the backend and website.

Default target today:

- Pune, India

## Main Purpose

The pipeline creates the structured dataset that powers:

- destination search
- nearby recommendations
- logistics lookup
- itinerary generation
- grounded Ollama prompts

## Files In This Folder

### [main.py](/D:/Yatraai/Data%20collection/main.py)

Pipeline entry point.

It handles:

- CLI arguments
- logging setup
- running collection, cleaning, and saving

### [collector.py](/D:/Yatraai/Data%20collection/collector.py)

Responsible for raw place collection from supported sources.

### [cleaner.py](/D:/Yatraai/Data%20collection/cleaner.py)

Responsible for merging, normalization, deduplication, and enrichment.

### [saver.py](/D:/Yatraai/Data%20collection/saver.py)

Responsible for writing the cleaned outputs and summary files.

## Data Sources

### OpenStreetMap Overpass API

Primary source.

Used for:

- attractions
- restaurants
- cafes
- hotels
- hospitals
- transport
- shopping
- banks and ATMs

### Foursquare Places API

Optional enrichment source.

Used only if you pass an API key.

## Pipeline Flow

The pipeline runs in 3 steps:

1. Collect raw records from OSM and optionally Foursquare
2. Clean, merge, normalize, and enrich the records
3. Save final dataset files into the project `data/` folder

## Output Files

By default, the pipeline writes into:

```text
D:\Yatraai\data
```

Typical outputs:

```text
data/
  places_dataset.csv
  dataset_stats.json
  categories/
    bank_atm.csv
    cafe.csv
    hospital.csv
    hotel.csv
    restaurant.csv
    shopping.csv
    tourist_attraction.csv
    transport.csv
```

## Important Dataset Fields

The generated dataset includes fields such as:

- `place_id`
- `place_name`
- `latitude`
- `longitude`
- `category`
- `subcategory`
- `address`
- `rating`
- `tags`
- `source`
- `website`
- `phone`
- `opening_hours`
- `description`
- `is_free`
- `is_open_24h`
- `price_level`
- `category_label`

## How To Run

From the project root:

```powershell
python ".\Data collection\main.py"
```

Example with a different city:

```powershell
python ".\Data collection\main.py" --city Mumbai
```

Example with Foursquare:

```powershell
python ".\Data collection\main.py" --city Goa --fsq-key YOUR_API_KEY
```

## Notes

- logs are also written to `pipeline.log` in the project root
- per-category CSV splitting is enabled by default
- if the city is not predefined, the pipeline attempts a fallback geocoding lookup

## Relationship To The Rest Of The Project

- this folder creates the dataset
- the backend consumes that dataset
- the frontend should eventually consume backend/API responses based on that dataset
