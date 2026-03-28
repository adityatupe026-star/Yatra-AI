import logging
import time
from typing import Optional

import requests
import pandas as pd


# ─────────────────────────────────────────────────────────────
# CITY BOUNDING BOXES  (south, west, north, east)
# ─────────────────────────────────────────────────────────────
CITY_BBOXES: dict[str, tuple[float, float, float, float]] = {
    "Pune":      (18.40, 73.74, 18.65, 74.02),
    "Mumbai":    (18.89, 72.77, 19.28, 73.02),
    "Delhi":     (28.40, 76.84, 28.88, 77.35),
    "Bangalore": (12.83, 77.46, 13.14, 77.78),
    "Chennai":   (12.82, 79.99, 13.23, 80.31),
    "Hyderabad": (17.25, 78.25, 17.60, 78.65),
    "Kolkata":   (22.45, 88.24, 22.70, 88.48),
    "Nashik":    (19.95, 73.72, 20.05, 73.85),
    "Goa":       (15.20, 73.80, 15.60, 74.10),
    "Jaipur":    (26.80, 75.72, 27.00, 75.95),
    "Agra":      (27.10, 77.95, 27.25, 78.10),
}

CITY    = "Pune"
COUNTRY = "India"

# ─────────────────────────────────────────────────────────────
# OVERPASS CONFIG
# ─────────────────────────────────────────────────────────────
OVERPASS_URL   = "https://overpass-api.de/api/interpreter"
OVERPASS_DELAY = 3.0

OVERPASS_QUERIES: dict[str, str] = {
    "tourist_attraction": """
        node["tourism"~"attraction|museum|viewpoint|artwork|gallery|theme_park"](BBOX);
        way["tourism"~"attraction|museum|viewpoint|artwork|gallery|theme_park"](BBOX);
        node["historic"~"monument|memorial|fort|ruins|castle|temple|mosque|church"](BBOX);
        way["historic"~"monument|memorial|fort|ruins|castle|temple|mosque|church"](BBOX);
        node["amenity"="place_of_worship"](BBOX);
        way["amenity"="place_of_worship"](BBOX);
        node["leisure"~"park|nature_reserve|garden|stadium"](BBOX);
        way["leisure"~"park|nature_reserve|garden|stadium"](BBOX);
    """,
    "restaurant": """
        node["amenity"~"restaurant|fast_food|food_court|biergarten"](BBOX);
        way["amenity"~"restaurant|fast_food|food_court|biergarten"](BBOX);
    """,
    "cafe": """
        node["amenity"~"cafe|juice_bar|ice_cream|bakery|tea_house"](BBOX);
        way["amenity"~"cafe|juice_bar|ice_cream|bakery|tea_house"](BBOX);
    """,
    "hospital": """
        node["amenity"~"hospital|clinic|doctors|pharmacy|dentist|veterinary"](BBOX);
        way["amenity"~"hospital|clinic|doctors|pharmacy|dentist|veterinary"](BBOX);
    """,
    "hotel": """
        node["tourism"~"hotel|hostel|guest_house|motel|apartment"](BBOX);
        way["tourism"~"hotel|hostel|guest_house|motel|apartment"](BBOX);
    """,
    "transport": """
        node["amenity"~"bus_station|taxi|car_rental|bicycle_rental"](BBOX);
        way["amenity"~"bus_station|taxi|car_rental|bicycle_rental"](BBOX);
        node["railway"~"station|halt|tram_stop|subway_entrance"](BBOX);
        way["railway"~"station|halt|tram_stop|subway_entrance"](BBOX);
        node["aeroway"="terminal"](BBOX);
    """,
    "shopping": """
        node["shop"~"mall|market|supermarket|clothes|jewelry|souvenir"](BBOX);
        way["shop"~"mall|market|supermarket|clothes|jewelry|souvenir"](BBOX);
        node["amenity"="marketplace"](BBOX);
        way["amenity"="marketplace"](BBOX);
    """,
    "bank_atm": """
        node["amenity"~"bank|atm|money_transfer"](BBOX);
        way["amenity"~"bank|atm|money_transfer"](BBOX);
    """,
}

# ─────────────────────────────────────────────────────────────
# FOURSQUARE CONFIG
# ─────────────────────────────────────────────────────────────
FSQ_SEARCH_URL = "https://api.foursquare.com/v3/places/search"
FSQ_DELAY      = 0.5

FSQ_CATEGORIES: dict[str, list[str]] = {
    "tourist_attraction": ["16000", "16032", "16020", "16024", "10000", "10027"],
    "restaurant":         ["13065", "13002", "13049", "13056", "13145", "13064"],
    "cafe":               ["13032", "13035", "13040", "13028", "13031"],
    "hospital":           ["15014", "15039", "15058", "15021", "15005"],
    "hotel":              ["19014", "19009", "19010", "19012"],
    "transport":          ["19040", "19046", "19044", "19050"],
    "shopping":           ["17000", "17069", "17114", "17145"],
    "bank_atm":           ["11093", "11095"],
}

SEMANTIC_TAGS: dict[str, list[str]] = {
    "tourist_attraction": ["tourism", "culture", "sightseeing", "landmark"],
    "restaurant":         ["food", "dining", "eat_out"],
    "cafe":               ["food", "coffee", "casual", "hangout"],
    "hospital":           ["health", "medical", "emergency"],
    "hotel":              ["accommodation", "stay", "lodging"],
    "transport":          ["transport", "transit", "commute"],
    "shopping":           ["shopping", "retail", "market"],
    "bank_atm":           ["finance", "money", "banking"],
}

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# BBOX HELPERS
# ─────────────────────────────────────────────────────────────
def get_bbox(city: str, country: str = "India") -> tuple[float, float, float, float]:
    """Return bounding box for city. Uses hardcoded dict, falls back to Nominatim."""
    key = city.strip().title()
    if key in CITY_BBOXES:
        bbox = CITY_BBOXES[key]
        log.info("Bbox (hardcoded)  →  S=%.4f W=%.4f N=%.4f E=%.4f", *bbox)
        return bbox

    log.info("City '%s' not in hardcoded list — querying Nominatim …", city)
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"city": city, "country": country,
                    "format": "json", "limit": 1},
            headers={"User-Agent": "TourismPipeline/3.0"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data:
            bb = data[0]["boundingbox"]  # [south, north, west, east]
            bbox = (float(bb[0]), float(bb[2]), float(bb[1]), float(bb[3]))
            log.info("Bbox (Nominatim)  →  S=%.4f W=%.4f N=%.4f E=%.4f", *bbox)
            return bbox
    except Exception as exc:
        log.warning("Nominatim failed: %s", exc)

    raise RuntimeError(
        f"Cannot resolve bounding box for '{city}'. "
        f"Add it to CITY_BBOXES in collector.py"
    )


def subdivide_bbox(
    bbox: tuple[float, float, float, float],
    rows: int = 3,
    cols: int = 3,
) -> list[tuple[float, float, float, float]]:
    """Split bbox into rows×cols grid to bypass Overpass 500-element cap."""
    s, w, n, e = bbox
    lat_step = (n - s) / rows
    lon_step = (e - w) / cols
    cells = []
    for r in range(rows):
        for c in range(cols):
            cells.append((
                round(s + r * lat_step, 6),
                round(w + c * lon_step, 6),
                round(s + (r + 1) * lat_step, 6),
                round(w + (c + 1) * lon_step, 6),
            ))
    return cells


# ─────────────────────────────────────────────────────────────
# OVERPASS FETCHER
# ─────────────────────────────────────────────────────────────
def _safe_get(tags: dict, *keys) -> Optional[str]:
    for k in keys:
        v = tags.get(k, "").strip()
        if v:
            return v
    return None


def _build_overpass_query(cell: tuple, body: str) -> str:
    s, w, n, e = cell
    inner = body.replace("BBOX", f"{s},{w},{n},{e}")
    return f"[out:json][timeout:60];\n(\n{inner}\n);\nout center tags;"


def _fetch_overpass_cell(cell: tuple, query_body: str) -> list[dict]:
    query = _build_overpass_query(cell, query_body)
    for attempt in range(3):
        try:
            resp = requests.post(
                OVERPASS_URL,
                data={"data": query},
                timeout=90,
                headers={"User-Agent": "TourismPipeline/3.0"},
            )
            resp.raise_for_status()
            return resp.json().get("elements", [])
        except requests.HTTPError as e:
            if resp.status_code == 429:
                wait = 30 * (attempt + 1)
                log.warning("Overpass rate-limited. Waiting %ds …", wait)
                time.sleep(wait)
            else:
                log.warning("Overpass HTTP error: %s", e)
                return []
        except requests.RequestException as e:
            log.warning("Overpass request failed (attempt %d): %s", attempt + 1, e)
            time.sleep(5)
    return []


def _parse_overpass_element(element: dict, category: str) -> Optional[dict]:
    tags = element.get("tags", {})
    if element["type"] == "node":
        lat, lon = element.get("lat"), element.get("lon")
    else:
        c = element.get("center", {})
        lat, lon = c.get("lat"), c.get("lon")
    if not lat or not lon:
        return None
    name = _safe_get(tags, "name", "name:en", "official_name", "brand")
    if not name:
        return None
    address = ", ".join(filter(None, [
        _safe_get(tags, "addr:housenumber"),
        _safe_get(tags, "addr:street"),
        _safe_get(tags, "addr:suburb", "addr:neighbourhood"),
        _safe_get(tags, "addr:city"),
        _safe_get(tags, "addr:postcode"),
    ])) or None
    return {
        "place_name":    name,
        "latitude":      round(float(lat), 6),
        "longitude":     round(float(lon), 6),
        "category":      category,
        "subcategory":   _safe_get(tags, "tourism", "amenity", "historic",
                                   "leisure", "shop", "railway", "aeroway") or "general",
        "address":       address,
        "rating":        _safe_get(tags, "stars", "rating"),
        "tags":          "|".join(SEMANTIC_TAGS.get(category, [])),
        "source":        "openstreetmap",
        "osm_id":        str(element.get("id", "")),
        "website":       _safe_get(tags, "website", "contact:website"),
        "phone":         _safe_get(tags, "phone", "contact:phone"),
        "opening_hours": _safe_get(tags, "opening_hours"),
        "cuisine":       _safe_get(tags, "cuisine"),
        "description":   _safe_get(tags, "description"),
        "wheelchair":    _safe_get(tags, "wheelchair"),
        "fee":           _safe_get(tags, "fee"),
        "image":         _safe_get(tags, "image", "wikimedia_commons"),
    }


def collect_overpass(bbox: tuple) -> pd.DataFrame:
    """Fetch all categories from Overpass using a 3×3 grid subdivision."""
    cells   = subdivide_bbox(bbox)
    records: list[dict] = []

    for category, query_body in OVERPASS_QUERIES.items():
        log.info("── Overpass: %s ──", category)
        cat_n = 0
        for i, cell in enumerate(cells, 1):
            elements = _fetch_overpass_cell(cell, query_body)
            valid = [r for r in
                     (_parse_overpass_element(e, category) for e in elements)
                     if r]
            records.extend(valid)
            cat_n += len(valid)
            log.info("   cell %d/9  → %d records", i, len(valid))
            time.sleep(OVERPASS_DELAY)
        log.info("   TOTAL %-22s → %d records", category, cat_n)

    log.info("Overpass total raw: %d", len(records))
    return pd.DataFrame(records) if records else pd.DataFrame()


# ─────────────────────────────────────────────────────────────
# FOURSQUARE FETCHER
# ─────────────────────────────────────────────────────────────
def _fetch_fsq_category(
    fsq_key: str, lat: float, lon: float,
    category: str, cat_ids: list[str],
    radius: int = 15000, limit: int = 50,
) -> list[dict]:
    headers = {"Authorization": fsq_key, "Accept": "application/json"}
    params  = {
        "ll":         f"{lat},{lon}",
        "categories": ",".join(cat_ids),
        "radius":     radius,
        "limit":      limit,
        "fields":     "name,geocodes,location,categories,rating,website,tel,hours,description",
    }
    try:
        resp = requests.get(FSQ_SEARCH_URL, headers=headers,
                            params=params, timeout=15)
        resp.raise_for_status()
        places = resp.json().get("results", [])
    except requests.RequestException as exc:
        log.warning("Foursquare request failed (%s): %s", category, exc)
        return []

    records = []
    for p in places:
        geo  = p.get("geocodes", {}).get("main", {})
        loc  = p.get("location", {})
        cats = p.get("categories", [{}])
        addr = ", ".join(filter(None, [
            loc.get("address"), loc.get("locality"), loc.get("postcode"),
        ])) or None
        records.append({
            "place_name":    p.get("name", "").strip(),
            "latitude":      geo.get("latitude"),
            "longitude":     geo.get("longitude"),
            "category":      category,
            "subcategory":   cats[0].get("name") if cats else "general",
            "address":       addr,
            "rating":        str(p.get("rating", "")) or None,
            "tags":          "|".join(SEMANTIC_TAGS.get(category, [])),
            "source":        "foursquare",
            "osm_id":        p.get("fsq_id", ""),
            "website":       p.get("website"),
            "phone":         p.get("tel"),
            "opening_hours": (p.get("hours") or {}).get("display"),
            "cuisine":       cats[0].get("name") if cats else None,
            "description":   p.get("description"),
            "wheelchair":    None,
            "fee":           None,
            "image":         None,
        })
    return records


def collect_foursquare(bbox: tuple, fsq_key: str) -> pd.DataFrame:
    """Sample 3×3 grid of centre points and query FSQ for each category."""
    s, w, n, e = bbox
    lats = [s + (n - s) * (i + 0.5) / 3 for i in range(3)]
    lons = [w + (e - w) * (i + 0.5) / 3 for i in range(3)]
    centres = [(round(lat, 5), round(lon, 5)) for lat in lats for lon in lons]

    records: list[dict] = []
    total_calls = 0

    for category, cat_ids in FSQ_CATEGORIES.items():
        log.info("── Foursquare: %s ──", category)
        cat_n = 0
        for lat, lon in centres:
            batch = _fetch_fsq_category(fsq_key, lat, lon, category, cat_ids)
            records.extend(batch)
            cat_n    += len(batch)
            total_calls += 1
            time.sleep(FSQ_DELAY)
        log.info("   TOTAL %-22s → %d records", category, cat_n)

    log.info("Foursquare total raw: %d  (%d API calls used)", len(records), total_calls)
    return pd.DataFrame(records) if records else pd.DataFrame()


# ─────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────
def collect_all(
    city: str    = CITY,
    country: str = COUNTRY,
    fsq_key: str = "",
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Collect place data from all sources.

    Returns:
        (osm_df, fsq_df) — raw DataFrames from each source.
        fsq_df is empty if no fsq_key is provided.
    """
    bbox = get_bbox(city, country)

    log.info("Collecting from OpenStreetMap Overpass …")
    osm_df = collect_overpass(bbox)

    fsq_df = pd.DataFrame()
    if fsq_key:
        log.info("Collecting from Foursquare …")
        fsq_df = collect_foursquare(bbox, fsq_key)
    else:
        log.info("Foursquare skipped (no API key provided).")
        log.info("  → Get a free key: https://developer.foursquare.com/")

    return osm_df, fsq_df
