import argparse
import logging
import sys
from pathlib import Path

import pandas as pd

# ── Local modules ────────────────────────────────────────────
from collector import collect_all, CITY, COUNTRY
from cleaner   import clean_and_merge
from saver     import save_all, print_summary


# ─────────────────────────────────────────────────────────────
# LOGGING SETUP
# ─────────────────────────────────────────────────────────────
def _setup_logging(level: int = logging.INFO) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("pipeline.log", encoding="utf-8"),
        ],
    )


# ─────────────────────────────────────────────────────────────
# PIPELINE
# ─────────────────────────────────────────────────────────────
def run_pipeline(
    city:       str  = CITY,
    country:    str  = COUNTRY,
    fsq_key:    str  = "",
    output_dir: str  = "data",
    split_cats: bool = True,
    verbose:    bool = False,
) -> pd.DataFrame:
    """
    Full end-to-end pipeline:
      1. Collect raw data from Overpass (+ Foursquare if key given)
      2. Merge, clean, and enrich
      3. Save to CSV (+ per-category CSVs + stats JSON)
      4. Print summary

    Returns the final clean DataFrame.
    """
    log = logging.getLogger(__name__)

    DIVIDER = "═" * 60

    log.info(DIVIDER)
    log.info("  AI TRAVEL ASSISTANT  —  DATA PIPELINE")
    log.info(DIVIDER)
    log.info("  City    : %s, %s", city, country)
    log.info("  Sources : OpenStreetMap%s", " + Foursquare" if fsq_key else "")
    log.info("  Output  : %s/", output_dir)
    log.info(DIVIDER)

    # ── STEP 1: COLLECT ─────────────────────────────────────
    log.info("[1/3]  Collecting raw place data …")
    osm_df, fsq_df = collect_all(city=city, country=country, fsq_key=fsq_key)
    log.info("       OSM records    : %d", len(osm_df))
    log.info("       FSQ records    : %d", len(fsq_df))

    # ── STEP 2: CLEAN ───────────────────────────────────────
    log.info("[2/3]  Cleaning and merging …")
    df = clean_and_merge([osm_df, fsq_df])

    if df.empty:
        log.error("Pipeline produced zero records. Check network/API access.")
        return df

    # ── STEP 3: SAVE ────────────────────────────────────────
    log.info("[3/3]  Saving dataset …")
    paths = save_all(df, city=city, output_dir=output_dir, split_cats=split_cats)

    # ── SUMMARY ─────────────────────────────────────────────
    print_summary(df, city=city)

    log.info(DIVIDER)
    log.info("  ✅  Pipeline complete!")
    log.info("  Main CSV   → %s", paths.get("main_csv", "N/A"))
    log.info("  Stats JSON → %s", paths.get("stats_json", "N/A"))
    log.info("  Log file   → pipeline.log")
    log.info(DIVIDER)

    return df


# ─────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────
def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="AI Travel Assistant — Tourism Data Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py
  python main.py --city Mumbai
  python main.py --city Goa --fsq-key fsq_xxxxx
  python main.py --city Jaipur --output-dir jaipur_data --no-split
        """,
    )
    p.add_argument("--city",       default=CITY,    help=f"City name (default: {CITY})")
    p.add_argument("--country",    default=COUNTRY, help=f"Country   (default: {COUNTRY})")
    p.add_argument("--fsq-key",    default="",      help="Foursquare v3 API key (optional)")
    p.add_argument("--output-dir", default="data",  help="Output directory (default: data/)")
    p.add_argument("--no-split",   action="store_true", help="Skip per-category CSV files")
    p.add_argument("--verbose",    action="store_true", help="Enable DEBUG logging")
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()

    _setup_logging(logging.DEBUG if args.verbose else logging.INFO)

    df = run_pipeline(
        city       = args.city,
        country    = args.country,
        fsq_key    = args.fsq_key,
        output_dir = args.output_dir,
        split_cats = not args.no_split,
        verbose    = args.verbose,
    )

    sys.exit(0 if not df.empty else 1)
