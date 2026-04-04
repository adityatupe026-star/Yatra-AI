import logging
import re
from typing import Optional

import pandas as pd

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# EXPECTED COLUMNS (ensures consistent schema even from one source)
# ─────────────────────────────────────────────────────────────
SCHEMA_COLUMNS = [
    "place_id", "place_name", "latitude", "longitude",
    "category", "subcategory", "address", "rating", "rating_normalized",
    "tags", "source", "osm_id", "website", "phone",
    "opening_hours", "cuisine", "description",
    "wheelchair", "fee", "image",
    "is_free", "is_open_24h", "price_level",
]

# Category → human-friendly label for the AI assistant
CATEGORY_LABELS = {
    "tourist_attraction": "Tourist Attraction",
    "restaurant":         "Restaurant / Eatery",
    "cafe":               "Café / Coffee Shop",
    "hospital":           "Hospital / Medical",
    "hotel":              "Hotel / Accommodation",
    "transport":          "Transport Hub",
    "shopping":           "Shopping",
    "bank_atm":           "Bank / ATM",
}


# ─────────────────────────────────────────────────────────────
# TEXT HELPERS
# ─────────────────────────────────────────────────────────────
def _title_case(s: Optional[str]) -> Optional[str]:
    if not s or not isinstance(s, str):
        return None
    return s.strip().title()


def _clean_phone(phone: Optional[str]) -> Optional[str]:
    if not phone or not isinstance(phone, str):
        return None
    cleaned = re.sub(r"[^\d+\s\-()]", "", phone).strip()
    return cleaned if len(cleaned) >= 7 else None


def _clean_website(url: Optional[str]) -> Optional[str]:
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    if url and not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url if len(url) > 10 else None


def _normalize_rating(rating: Optional[str]) -> Optional[float]:
    """Convert various rating formats to 0–10 float."""
    if not rating or rating == "N/A":
        return None
    try:
        val = float(str(rating).replace(",", "."))
        if 0 <= val <= 5:
            return round(val * 2, 1)   # Convert 0-5 → 0-10
        if 0 <= val <= 10:
            return round(val, 1)
        return None
    except (ValueError, TypeError):
        return None


def _extract_is_free(tags: Optional[str], fee: Optional[str]) -> bool:
    """Heuristic: is the place likely free to enter?"""
    if isinstance(fee, str) and fee.lower() in ("no", "free", "0"):
        return True
    if isinstance(tags, str) and "free" in tags.lower():
        return True
    return False


def _extract_is_open_24h(hours: Optional[str]) -> bool:
    if not hours or not isinstance(hours, str):
        return False
    return "24/7" in hours or "24 hours" in hours.lower()


def _estimate_price_level(category: str, rating: Optional[float]) -> Optional[str]:
    """
    Rough heuristic price-level for the AI assistant to use.
    Returns: "budget" | "mid-range" | "premium" | None
    """
    if category in ("bank_atm", "transport", "hospital"):
        return None
    if rating is None:
        return "unknown"
    if rating >= 8.5:
        return "premium"
    if rating >= 6.5:
        return "mid-range"
    return "budget"


def _generate_place_id(row: pd.Series, idx: int) -> str:
    """Generate a stable place ID from source + osm_id or index."""
    src = str(row.get("source", "unk"))[:3].upper()
    oid = str(row.get("osm_id", "")).strip()
    if oid and oid != "N/A":
        return f"{src}_{oid}"
    return f"{src}_{idx:06d}"


# ─────────────────────────────────────────────────────────────
# CORE CLEANING
# ─────────────────────────────────────────────────────────────
def _drop_invalid(df: pd.DataFrame) -> pd.DataFrame:
    """Remove rows missing critical fields or with invalid coords."""
    before = len(df)
    df = df.dropna(subset=["place_name", "latitude", "longitude"])
    df = df[df["place_name"].astype(str).str.strip() != ""]
    df = df[df["latitude"].between(-90, 90) & df["longitude"].between(-180, 180)]
    log.info("  Invalid rows dropped: %d → %d", before, len(df))
    return df


def _deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    """Remove exact duplicates, then near-duplicates by name + rounded coords."""
    before = len(df)

    # Exact duplicates
    df = df.drop_duplicates()

    # Near-duplicates: same name (lowercased) + lat/lon rounded to 4 decimal places
    df["_name_l"] = df["place_name"].str.lower().str.strip()
    df["_lat_r"]  = df["latitude"].round(4)
    df["_lon_r"]  = df["longitude"].round(4)

    # Prefer foursquare records (they often have ratings)
    priority = {"foursquare": 0, "openstreetmap": 1}
    df["_src_rank"] = df["source"].map(priority).fillna(99).astype(int)
    df = df.sort_values("_src_rank")
    df = df.drop_duplicates(subset=["_name_l", "_lat_r", "_lon_r"], keep="first")
    df = df.drop(columns=["_name_l", "_lat_r", "_lon_r", "_src_rank"])

    log.info("  After deduplication: %d → %d", before, len(df))
    return df


def _enrich(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived columns useful for the AI travel assistant."""
    df["rating_normalized"] = df["rating"].apply(_normalize_rating)
    df["is_free"]           = df.apply(
        lambda r: _extract_is_free(r.get("tags"), r.get("fee")), axis=1)
    df["is_open_24h"]       = df["opening_hours"].apply(_extract_is_open_24h)
    df["price_level"]       = df.apply(
        lambda r: _estimate_price_level(r.get("category", ""), r.get("rating_normalized")),
        axis=1,
    )
    df["category_label"]    = df["category"].map(CATEGORY_LABELS).fillna(df["category"])
    return df


def _normalise_text(df: pd.DataFrame) -> pd.DataFrame:
    """Title-case names, lower-case categories, clean phones & websites."""
    df["place_name"] = df["place_name"].apply(_title_case)
    df["category"]   = df["category"].str.strip().str.lower()
    df["phone"]      = df["phone"].apply(_clean_phone)
    df["website"]    = df["website"].apply(_clean_website)
    return df


def _fill_missing(df: pd.DataFrame) -> pd.DataFrame:
    """Replace NaN / empty strings with 'N/A' in optional text columns."""
    text_cols = [
        "address", "rating", "website", "phone",
        "opening_hours", "cuisine", "description",
        "wheelchair", "fee", "image", "subcategory",
    ]
    for col in text_cols:
        if col in df.columns:
            df[col] = (
                df[col]
                .fillna("N/A")
                .replace("", "N/A")
                .replace("nan", "N/A")
            )
    return df


# ─────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────
def clean_and_merge(frames: list[pd.DataFrame]) -> pd.DataFrame:
    """
    Merge, clean, deduplicate, and enrich raw place DataFrames.

    Args:
        frames: List of raw DataFrames (from collector.py).

    Returns:
        Single clean DataFrame ready for saving.
    """
    frames = [f for f in frames if f is not None and not f.empty]
    if not frames:
        log.error("No data to clean — all input DataFrames are empty.")
        return pd.DataFrame(columns=SCHEMA_COLUMNS)

    df = pd.concat(frames, ignore_index=True)
    log.info("Combined raw records: %d", len(df))

    # ── Ensure all schema columns exist ────────────────────────
    for col in SCHEMA_COLUMNS:
        if col not in df.columns:
            df[col] = None

    # ── Core cleaning steps ─────────────────────────────────────
    df = _drop_invalid(df)
    df = _normalise_text(df)
    df = _deduplicate(df)
    df = _enrich(df)
    df = _fill_missing(df)

    # ── Assign stable place IDs ─────────────────────────────────
    df = df.reset_index(drop=True)
    df["place_id"] = [_generate_place_id(row, i) for i, row in df.iterrows()]

    # ── Final sort ───────────────────────────────────────────────
    df = df.sort_values(["category", "place_name"]).reset_index(drop=True)

    # ── Reorder columns to schema order ─────────────────────────
    extra_cols = [c for c in df.columns if c not in SCHEMA_COLUMNS]
    final_cols = SCHEMA_COLUMNS + extra_cols
    df = df[[c for c in final_cols if c in df.columns]]

    log.info("Final clean records: %d", len(df))
    return df
