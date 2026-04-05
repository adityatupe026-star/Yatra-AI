# YatraAI Data Collection Pipeline

This folder contains the place-data pipeline for YatraAI.

Its job is to collect tourism and travel-support POIs, clean and normalize them, enrich them with useful fields, and save the final dataset used by the backend and frontend.

## Main Purpose

The pipeline creates the structured dataset that powers:

- destination search
- nearby recommendations
- logistics lookup
- itinerary generation
- grounded travel answers

## Files In This Folder

### [main.py](/D:/Yatraai/Data%20collection/main.py)

Pipeline entry point.

### [collector.py](/D:/Yatraai/Data%20collection/collector.py)

Collects raw place data from supported sources.

### [cleaner.py](/D:/Yatraai/Data%20collection/cleaner.py)

Normalizes, deduplicates, and enriches the records.

### [saver.py](/D:/Yatraai/Data%20collection/saver.py)

Writes the cleaned outputs and summary files.

## Data Sources

### OpenStreetMap Overpass API

Primary source for:

- attractions
- restaurants
- cafes
- hotels
- hospitals
- transport
- shopping
- banks and ATMs

### Foursquare Places API

Optional enrichment source when an API key is available.

## Pipeline Flow

1. Collect raw records
2. Clean and enrich the records
3. Save final dataset files into `data/`

## Output Files

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
python ".\data_collection\main.py"
```

You can change the city if needed:

```powershell
python ".\data_collection\main.py" --city Mumbai
```

## Notes

- logs are written to `pipeline.log`
- per-category CSV splitting is enabled by default
- if the city is not predefined, the pipeline attempts a fallback geocoding lookup

## Relationship To The Rest Of The Project

- this folder creates the place dataset
- the backend consumes that dataset
- the dashboard reads the tourism datasets from `data/`
- the travel partner inbox uses frontend dummy data, not this pipeline
- the bookings hub and saved booking cards are frontend storage backed

## Hotel / Stay Pipeline

For hotel and stay-specific data, use the nested `hotel data collection/` folder.

That pipeline writes the enriched stay dataset into:

- `data/stay/hotel_stay_dataset.csv`
- `data/stay/raw/`
- `data/stay/cleaned/`
- `data/stay/features/`
- `data/stay/model/artifacts/`

The stay pipeline accepts `--city`, `--district`, `--place`, and optional `--state` so you can narrow collection to a specific locality or landmark.
