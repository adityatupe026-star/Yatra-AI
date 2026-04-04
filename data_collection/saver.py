import json
import logging
import os
from datetime import datetime
from pathlib import Path

import pandas as pd

log = logging.getLogger(__name__)

# Default paths
DEFAULT_OUTPUT_DIR  = "data"
MAIN_CSV_NAME       = "places_dataset.csv"
STATS_JSON_NAME     = "dataset_stats.json"


# ─────────────────────────────────────────────────────────────
# CSV SAVERS
# ─────────────────────────────────────────────────────────────
def save_csv(df: pd.DataFrame, path: str) -> None:
    """Save DataFrame to CSV at the given path."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False, encoding="utf-8")
    log.info("Saved → %s  (%d rows × %d cols)", path, *df.shape)


def save_category_csvs(df: pd.DataFrame, output_dir: str) -> None:
    """Save one CSV per category into output_dir/categories/."""
    cat_dir = Path(output_dir) / "categories"
    cat_dir.mkdir(parents=True, exist_ok=True)

    for category, group in df.groupby("category"):
        fname = cat_dir / f"{category}.csv"
        group.to_csv(fname, index=False, encoding="utf-8")
        log.info("  Category CSV → %s  (%d rows)", fname, len(group))


# ─────────────────────────────────────────────────────────────
# STATS JSON
# ─────────────────────────────────────────────────────────────
def _build_stats(df: pd.DataFrame, city: str) -> dict:
    """Build a statistics dict for the dataset."""
    stats = {
        "generated_at":    datetime.utcnow().isoformat() + "Z",
        "city":            city,
        "total_places":    int(len(df)),
        "categories":      {},
        "sources":         {},
        "has_rating":      int(df["rating_normalized"].notna().sum()) if "rating_normalized" in df else 0,
        "has_phone":       int((df["phone"] != "N/A").sum()) if "phone" in df else 0,
        "has_website":     int((df["website"] != "N/A").sum()) if "website" in df else 0,
        "has_address":     int((df["address"] != "N/A").sum()) if "address" in df else 0,
        "open_24h":        int(df["is_open_24h"].sum()) if "is_open_24h" in df else 0,
        "free_entry":      int(df["is_free"].sum()) if "is_free" in df else 0,
    }
    if "category" in df.columns:
        stats["categories"] = df["category"].value_counts().to_dict()
    if "source" in df.columns:
        stats["sources"] = df["source"].value_counts().to_dict()
    return stats


def save_stats_json(df: pd.DataFrame, city: str, path: str) -> None:
    """Save dataset statistics as JSON."""
    stats = _build_stats(df, city)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    log.info("Stats JSON → %s", path)


# ─────────────────────────────────────────────────────────────
# SUMMARY PRINTER
# ─────────────────────────────────────────────────────────────
def print_summary(df: pd.DataFrame, city: str = "") -> None:
    """Print a rich human-readable summary to stdout."""
    if df.empty:
        print("\n  ⚠  No data to summarise.\n")
        return

    WIDTH = 65

    def _bar(n: int, max_n: int, width: int = 20) -> str:
        filled = int(width * n / max_n) if max_n > 0 else 0
        return "█" * filled + "░" * (width - filled)

    print("\n" + "═" * WIDTH)
    print("  📍  DATASET SUMMARY" + (f"  [{city}]" if city else ""))
    print("═" * WIDTH)
    print(f"  Total places      : {len(df):,}")

    if "source" in df.columns:
        src_counts = df["source"].value_counts()
        print(f"  Sources           : {dict(src_counts)}")

    if "rating_normalized" in df.columns:
        has_rating = df["rating_normalized"].notna().sum()
        print(f"  With rating       : {has_rating:,} ({has_rating/len(df)*100:.1f}%)")

    if "phone" in df.columns:
        has_phone = (df["phone"] != "N/A").sum()
        print(f"  With phone number : {has_phone:,}")

    if "website" in df.columns:
        has_web = (df["website"] != "N/A").sum()
        print(f"  With website      : {has_web:,}")

    if "is_open_24h" in df.columns:
        open24 = df["is_open_24h"].sum()
        print(f"  Open 24/7         : {open24:,}")

    # Category breakdown
    if "category" in df.columns:
        counts = df["category"].value_counts()
        max_n  = counts.max()
        print(f"\n  Records per category:")
        for cat, n in counts.items():
            print(f"    {cat:<25} {n:>5,}  {_bar(n, max_n)}")

    # Top-rated places
    if "rating_normalized" in df.columns and "place_name" in df.columns:
        top = df.dropna(subset=["rating_normalized"]).nlargest(5, "rating_normalized")
        if not top.empty:
            print(f"\n  Top 5 Rated Places:")
            for _, row in top.iterrows():
                print(f"    ★ {row['place_name'][:35]:<35} {row['rating_normalized']}/10  [{row['category']}]")

    # Random sample
    print(f"\n  Sample records (5 random):")
    cols = ["place_name", "category", "latitude", "longitude"]
    sample = df[cols].sample(min(5, len(df)), random_state=42)
    for _, row in sample.iterrows():
        print(f"    • {row['place_name'][:30]:<30}  {row['category']:<22}  ({row['latitude']:.4f}, {row['longitude']:.4f})")

    print("═" * WIDTH + "\n")


# ─────────────────────────────────────────────────────────────
# ALL-IN-ONE SAVER
# ─────────────────────────────────────────────────────────────
def save_all(
    df: pd.DataFrame,
    city: str        = "",
    output_dir: str  = DEFAULT_OUTPUT_DIR,
    split_cats: bool = True,
) -> dict[str, str]:
    """
    Save everything — main CSV, per-category CSVs, and stats JSON.

    Args:
        df:         Clean DataFrame from cleaner.py
        city:       City name (used for stats JSON label)
        output_dir: Root directory for all output files
        split_cats: Also save per-category CSV files

    Returns:
        Dict of { "main_csv": path, "stats_json": path, "output_dir": path }
    """
    if df.empty:
        log.warning("DataFrame is empty — nothing to save.")
        return {}

    output_dir = str(output_dir)
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    main_csv   = os.path.join(output_dir, MAIN_CSV_NAME)
    stats_json = os.path.join(output_dir, STATS_JSON_NAME)

    save_csv(df, main_csv)
    save_stats_json(df, city, stats_json)

    if split_cats:
        save_category_csvs(df, output_dir)

    return {
        "main_csv":   main_csv,
        "stats_json": stats_json,
        "output_dir": output_dir,
    }
