from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Any

import altair as alt
import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
ASSET = Path(__file__).resolve().parent / "assets" / "tourism_bg.svg"
PLACES = DATA / "places_dataset.csv"
DESTS = DATA / "hackathon" / "destinations.json"
ITIN = DATA / "hackathon" / "itineraries.json"
LOCAL = DATA / "hackathon" / "local_intelligence.json"
COST = DATA / "hackathon" / "cost_benchmarks.json"
STATS = DATA / "dataset_stats.json"

alt.data_transformers.disable_max_rows()


def jload(path: Path, default: Any):
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_places() -> pd.DataFrame:
    if not PLACES.exists():
        return pd.DataFrame()
    df = pd.read_csv(PLACES)
    for col in ["latitude", "longitude", "rating_normalized"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    for col in ["is_free", "is_open_24h"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.lower().isin(["true", "1", "yes"])
    if "category_label" not in df.columns and "category" in df.columns:
        df["category_label"] = df["category"].astype(str).str.replace("_", " ").str.title()
    df["category_label"] = df.get("category_label", pd.Series(dtype=str)).fillna("Uncategorized")
    if "rating_normalized" in df.columns:
        df["rating_score"] = pd.to_numeric(df["rating_normalized"], errors="coerce")
    else:
        df["rating_score"] = pd.NA
    return df


def flat_destinations(records: list[dict[str, Any]]) -> pd.DataFrame:
    rows = []
    for item in records:
        budget = item.get("budget_range") or {}
        rows.append(
            {
                "name": item.get("name", ""),
                "state": item.get("state", ""),
                "region": item.get("region", ""),
                "type": item.get("type", ""),
                "low": budget.get("low"),
                "high": budget.get("high"),
                "label": budget.get("label", ""),
                "best_season": item.get("best_season", ""),
                "avg_cost": item.get("average_daily_cost"),
                "crowd": item.get("crowd_level", ""),
                "tags": " | ".join(item.get("tags", [])),
                "highlights": " | ".join(item.get("highlights", [])),
                "description": item.get("description", ""),
            }
        )
    return pd.DataFrame(rows)


def flat_itineraries(records: list[dict[str, Any]]) -> pd.DataFrame:
    rows = []
    for item in records:
        budget = item.get("budget") or {}
        rows.append(
            {
                "name": item.get("name", ""),
                "origin": item.get("origin", ""),
                "destination": item.get("destination", ""),
                "days": item.get("days"),
                "transport": item.get("transport", ""),
                "theme": item.get("theme", ""),
                "best_for": " | ".join(item.get("best_for", [])),
                "note": item.get("season_note", ""),
                "tip": item.get("savings_tip", ""),
                "low": budget.get("low"),
                "high": budget.get("high"),
                "label": budget.get("label", ""),
            }
        )
    return pd.DataFrame(rows)


def bg_uri() -> str:
    if not ASSET.exists():
        return ""
    return "data:image/svg+xml;base64," + base64.b64encode(ASSET.read_bytes()).decode("ascii")


def theme():
    uri = bg_uri()
    st.markdown(
        f"""
        <style>
        .stApp {{
            background: linear-gradient(180deg, rgba(4,10,20,.78), rgba(4,10,20,.94)), url("{uri}") center/cover fixed;
            color: #F5EFE3;
        }}
        .block-container {{ padding-top: 1rem; max-width: 1450px; }}
        section[data-testid="stSidebar"] {{ background: rgba(4,10,20,.84); backdrop-filter: blur(16px); }}
        .hero {{
            border: 1px solid rgba(255,255,255,.12);
            border-radius: 28px;
            padding: 1.3rem 1.5rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, rgba(14,21,38,.84), rgba(29,49,74,.58)), url("{uri}") center/cover no-repeat;
            box-shadow: 0 26px 80px rgba(0,0,0,.38);
        }}
        .hero h1 {{ margin: 0; color: #FFF7E2; font-size: 2.2rem; }}
        .hero p {{ margin: .6rem 0 0; color: rgba(245,239,227,.86); max-width: 72ch; }}
        .badge {{
            display: inline-block; margin: .45rem .45rem 0 0; padding: .35rem .72rem;
            border-radius: 999px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);
            color: #F9E7B5; font-size: .85rem;
        }}
        .card {{
            border-radius: 20px; padding: 1rem; height: 100%;
            background: linear-gradient(180deg, rgba(16,24,41,.9), rgba(9,15,28,.84));
            border: 1px solid rgba(255,255,255,.11); box-shadow: 0 16px 42px rgba(0,0,0,.24);
        }}
        .card h4 {{ margin: 0 0 .45rem 0; color: #FFE7A8; }}
        .card p {{ margin: 0; color: rgba(245,239,227,.82); line-height: 1.45; }}
        .stat {{
            border-radius: 18px; padding: .95rem 1rem; border-top: 3px solid var(--accent);
            background: linear-gradient(180deg, rgba(16,24,41,.9), rgba(9,15,28,.84));
            border: 1px solid rgba(255,255,255,.11); box-shadow: 0 14px 36px rgba(0,0,0,.22);
        }}
        .stat .label {{ color: rgba(243,236,220,.72); text-transform: uppercase; font-size: .76rem; letter-spacing: .08em; }}
        .stat .value {{ color: #FFF2CF; font-size: 1.55rem; font-weight: 800; line-height: 1.1; }}
        .stat .hint {{ color: rgba(243,236,220,.76); font-size: .85rem; margin-top: .35rem; }}
        .section {{ margin: 1rem 0 .3rem; color: #FFF7E2; font-size: 1.1rem; }}
        .subsection {{ margin: 0 0 .5rem; color: rgba(245,239,227,.72); font-size: .9rem; }}
        div[data-testid="stDataFrame"] {{ border-radius: 18px; overflow: hidden; }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def card(title: str, value: str, hint: str, accent: str) -> None:
    st.markdown(
        f'<div class="stat" style="--accent:{accent}"><div class="label">{title}</div><div class="value">{value}</div><div class="hint">{hint}</div></div>',
        unsafe_allow_html=True,
    )


def info(title: str, body: str) -> None:
    st.markdown(f'<div class="card"><h4>{title}</h4><p>{body}</p></div>', unsafe_allow_html=True)


def fmt_currency(value: Any) -> str:
    if value is None:
        return "n/a"
    try:
        num = float(value)
    except Exception:
        return "n/a"
    return f"INR {num:,.0f}"


def chart_style(chart: alt.Chart) -> alt.Chart:
    return chart.configure_view(strokeOpacity=0).configure_axis(
        gridColor="rgba(255,255,255,.12)",
        domainColor="rgba(255,255,255,.18)",
        labelColor="#F2EBDC",
        titleColor="#F2EBDC",
        tickColor="rgba(255,255,255,.18)",
    ).configure_legend(labelColor="#F2EBDC", titleColor="#F2EBDC").properties(background="transparent")


st.set_page_config(page_title="Tourism Trends Dashboard", layout="wide")
theme()

places = load_places()
destinations = flat_destinations(jload(DESTS, []))
itineraries = flat_itineraries(jload(ITIN, []))
local = jload(LOCAL, {})
cost = jload(COST, {})
stats = jload(STATS, {})

if places.empty and destinations.empty and itineraries.empty:
    st.info("No tourism data found. Check `data/places_dataset.csv` and `data/hackathon/*.json`.")
    st.stop()

nation = "India"

with st.sidebar:
    st.markdown("### Tourism Lens")
    region_opt = ["All"] + sorted(destinations["region"].dropna().astype(str).unique()) if not destinations.empty else ["All"]
    crowd_opt = ["All"] + sorted(destinations["crowd"].dropna().astype(str).unique()) if not destinations.empty else ["All"]
    cat_opt = ["All"] + sorted(places["category_label"].dropna().astype(str).unique()) if not places.empty else ["All"]
    region = st.selectbox("Region", region_opt)
    crowd = st.selectbox("Crowd level", crowd_opt)
    cat = st.selectbox("POI category", cat_opt)
    open_only = st.toggle("Open 24h only", value=False)
    free_only = st.toggle("Free entry only", value=False)
    min_rating = st.slider("Minimum rating", 0.0, 5.0, 0.0, 0.5)

f_dest = destinations.copy()
if region != "All" and not f_dest.empty:
    f_dest = f_dest[f_dest["region"].astype(str) == region]
if crowd != "All" and not f_dest.empty:
    f_dest = f_dest[f_dest["crowd"].astype(str) == crowd]

f_places = places.copy()
if cat != "All" and not f_places.empty:
    f_places = f_places[f_places["category_label"].astype(str) == cat]
if open_only and "is_open_24h" in f_places.columns:
    f_places = f_places[f_places["is_open_24h"]]
if free_only and "is_free" in f_places.columns:
    f_places = f_places[f_places["is_free"]]
if "rating_score" in f_places.columns:
    f_places = f_places[f_places["rating_score"].isna() | (f_places["rating_score"] >= min_rating)]

top_region = destinations["region"].mode().iat[0] if not destinations.empty and not destinations["region"].dropna().empty else "n/a"
avg_cost = round(pd.to_numeric(destinations["avg_cost"], errors="coerce").dropna().mean(), 0) if not destinations.empty else None
avg_rating = round(places["rating_score"].dropna().mean(), 2) if "rating_score" in places.columns and not places["rating_score"].dropna().empty else None

st.markdown(
    f"""
    <div class="hero">
        <div class="badge">Tourism Trends Dashboard</div>
        <h1>{nation} Travel Intelligence</h1>
        <p>Tourism-first analytics built from destination trends, itinerary patterns, and the place inventory. This view is designed for trip demand, budget planning, crowd signals, and visitor support analysis.</p>
        <div>
            <span class="badge">Places: {len(places):,}</span>
            <span class="badge">Destinations: {len(destinations):,}</span>
            <span class="badge">Itineraries: {len(itineraries):,}</span>
            <span class="badge">Top region: {top_region}</span>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

stats_cols = st.columns(6)
with stats_cols[0]:
    card("Places", f"{len(places):,}", "Tourism-support POIs", "#F2B134")
with stats_cols[1]:
    card("Attractions", f"{int((places['category'] == 'tourist_attraction').sum()) if 'category' in places.columns else 0:,}", "Direct visitor draws", "#58C7D2")
with stats_cols[2]:
    card("Average rating", f"{avg_rating:.2f}" if avg_rating is not None else "n/a", "Normalized place score", "#9AD94B")
with stats_cols[3]:
    card("Open 24h", f"{int(places['is_open_24h'].sum()) if 'is_open_24h' in places.columns else 0:,}", "Late-night access", "#F07C5C")
with stats_cols[4]:
    card("Free entry", f"{int(places['is_free'].sum()) if 'is_free' in places.columns else 0:,}", "Low-friction visits", "#C48BF5")
with stats_cols[5]:
    card("Avg daily cost", fmt_currency(avg_cost), "Destination-level spend", "#F5B942")

ins = st.columns(3)
with ins[0]:
    info("Visitor ecosystem", "The data shows both destination demand and on-ground support, so the dashboard can answer where people go and what helps them move comfortably.")
with ins[1]:
    info("Budget signal", "Destination budgets and itinerary bands make it easy to spot value travel, mid-range demand, and premium pull.")
with ins[2]:
    info("Planning value", "Crowd levels, best seasons, and transport choices are the core signals for tourism decisions.")

overview, dest_tab, itin_tab, map_tab, local_tab, raw_tab = st.tabs(
    ["Overview", "Destination Trends", "Itineraries", "Places Map", "Local Guide", "Raw Data"]
)

with overview:
    left, right = st.columns([1.1, 0.9])
    with left:
        st.markdown('<div class="section">Tourism mix</div>', unsafe_allow_html=True)
        st.markdown('<div class="subsection">Category share and rating distribution from the place inventory.</div>', unsafe_allow_html=True)
        if not f_places.empty and "category_label" in f_places.columns:
            cat_counts = f_places["category_label"].replace("", pd.NA).dropna().value_counts().reset_index()
            cat_counts.columns = ["category_label", "count"]
            chart = chart_style(
                alt.Chart(cat_counts)
                .mark_bar(cornerRadiusEnd=6, color="#F5B942")
                .encode(
                    y=alt.Y("category_label:N", sort="-x", title=None),
                    x=alt.X("count:Q", title="Places"),
                    tooltip=["category_label", "count"],
                )
                .properties(height=300)
            )
            st.altair_chart(chart, use_container_width=True)
        if not f_places.empty and "rating_score" in f_places.columns:
            rating_frame = f_places.dropna(subset=["rating_score"])
            if not rating_frame.empty:
                rating_chart = chart_style(
                    alt.Chart(rating_frame)
                    .mark_bar(color="#58C7D2", opacity=0.92)
                    .encode(
                        x=alt.X("rating_score:Q", bin=alt.Bin(maxbins=12), title="Rating"),
                        y=alt.Y("count()", title="Places"),
                        tooltip=["count()"],
                    )
                    .properties(height=230)
                )
                st.altair_chart(rating_chart, use_container_width=True)
    with right:
        st.markdown('<div class="section">Demand and crowd signals</div>', unsafe_allow_html=True)
        st.markdown('<div class="subsection">Budget spread and crowd intensity from the destination set.</div>', unsafe_allow_html=True)
        if not f_dest.empty:
            crowd_counts = f_dest["crowd"].replace("", pd.NA).dropna().value_counts().reset_index()
            crowd_counts.columns = ["crowd", "count"]
            crowd_chart = chart_style(
                alt.Chart(crowd_counts)
                .mark_arc(innerRadius=55)
                .encode(theta="count:Q", color="crowd:N", tooltip=["crowd", "count"])
                .properties(height=255)
            )
            st.altair_chart(crowd_chart, use_container_width=True)
            cost_frame = f_dest.dropna(subset=["low", "high"]).copy()
            if not cost_frame.empty:
                cost_frame["mid"] = (cost_frame["low"] + cost_frame["high"]) / 2
                cost_frame = cost_frame.sort_values("mid", ascending=False).head(8)
                cost_chart = chart_style(
                    alt.Chart(cost_frame)
                    .mark_bar(cornerRadiusEnd=5, color="#9AD94B")
                    .encode(
                        x=alt.X("mid:Q", title="Budget midpoint (INR)"),
                        y=alt.Y("name:N", sort="-x", title=None),
                        tooltip=["name", "state", "label", "low", "high"],
                    )
                    .properties(height=250)
                )
                st.altair_chart(cost_chart, use_container_width=True)
        insight_cols = st.columns(3)
        with insight_cols[0]:
            info("Visitor mix", f"Places and destination records together describe where visitors go and what services they need once they arrive.")
        with insight_cols[1]:
            info("Budget planning", f"Average daily cost is about {fmt_currency(avg_cost)}, so mid-range and premium patterns can be separated easily.")
        with insight_cols[2]:
            info("Timing", "Best-season tags and crowd labels are the core signals for turning travel intent into better planning advice.")

with dest_tab:
    d1, d2, d3, d4 = st.columns(4)
    d1.metric("Destinations", len(destinations))
    d2.metric("Regions", destinations["region"].nunique() if not destinations.empty else 0)
    d3.metric("Crowd labels", destinations["crowd"].nunique() if not destinations.empty else 0)
    d4.metric("Best-season labels", destinations["best_season"].nunique() if not destinations.empty else 0)
    left, right = st.columns([1.1, 0.9])
    with left:
        if not f_dest.empty:
            state_counts = f_dest["state"].replace("", pd.NA).dropna().value_counts().reset_index()
            state_counts.columns = ["state", "count"]
            st.altair_chart(
                chart_style(
                    alt.Chart(state_counts)
                    .mark_bar(cornerRadiusEnd=5, color="#F5B942")
                    .encode(x=alt.X("count:Q", title="Destinations"), y=alt.Y("state:N", sort="-x", title=None), tooltip=["state", "count"])
                    .properties(height=290)
                ),
                use_container_width=True,
            )
            region_counts = f_dest["region"].replace("", pd.NA).dropna().value_counts().reset_index()
            region_counts.columns = ["region", "count"]
            st.altair_chart(
                chart_style(
                    alt.Chart(region_counts)
                    .mark_arc(innerRadius=60)
                    .encode(theta="count:Q", color="region:N", tooltip=["region", "count"])
                    .properties(height=290)
                ),
                use_container_width=True,
            )
        else:
            st.write("No destination rows match the filters.")
    with right:
        if not f_dest.empty:
            tag_rows = f_dest.assign(tag=f_dest["tags"].str.split(" | ")).explode("tag").dropna(subset=["tag"])
            tags = tag_rows["tag"].replace("", pd.NA).dropna().value_counts().reset_index()
            tags.columns = ["tag", "count"]
            st.altair_chart(
                chart_style(
                    alt.Chart(tags.head(10))
                    .mark_bar(cornerRadiusEnd=5, color="#58C7D2")
                    .encode(x=alt.X("count:Q", title="Mentions"), y=alt.Y("tag:N", sort="-x", title=None), tooltip=["tag", "count"])
                    .properties(height=290)
                ),
                use_container_width=True,
            )
            cards = st.columns(2)
            for i, (_, row) in enumerate(f_dest.sort_values(["crowd", "avg_cost"], ascending=[True, False]).head(6).iterrows()):
                with cards[i % 2]:
                    info(f"{row['name']} · {row['state']}", f"{row['type']} | {row['label']} | {row['crowd']} crowd | {row['best_season']}. {row['description']}")

with itin_tab:
    i1, i2, i3 = st.columns(3)
    i1.metric("Itineraries", len(itineraries))
    i2.metric("Average days", f"{itineraries['days'].mean():.1f}" if not itineraries.empty else "n/a")
    i3.metric("Budget bands", itineraries["label"].nunique() if not itineraries.empty else 0)
    left, right = st.columns([1.05, 0.95])
    with left:
        if not itineraries.empty:
            transport = itineraries["transport"].replace("", pd.NA).dropna().value_counts().reset_index()
            transport.columns = ["transport", "count"]
            st.altair_chart(
                chart_style(
                    alt.Chart(transport)
                    .mark_bar(cornerRadiusEnd=5, color="#F5B942")
                    .encode(x=alt.X("transport:N", title=None), y=alt.Y("count:Q", title="Itineraries"), tooltip=["transport", "count"])
                    .properties(height=250)
                ),
                use_container_width=True,
            )
            scatter = itineraries.dropna(subset=["days", "high"]).copy()
            if not scatter.empty:
                st.altair_chart(
                    chart_style(
                        alt.Chart(scatter)
                        .mark_circle(size=160, color="#9AD94B", opacity=0.82)
                        .encode(
                            x=alt.X("days:Q", title="Trip days"),
                            y=alt.Y("high:Q", title="Upper budget (INR)"),
                            color=alt.Color("theme:N", title="Theme"),
                            tooltip=["name", "origin", "destination", "days", "label", "low", "high"],
                        )
                        .properties(height=320)
                    ),
                    use_container_width=True,
                )
    with right:
        if not itineraries.empty:
            st.altair_chart(
                chart_style(
                    alt.Chart(itineraries.dropna(subset=["high"]))
                    .mark_bar(cornerRadiusEnd=5, color="#58C7D2")
                    .encode(x=alt.X("high:Q", title="Upper budget (INR)"), y=alt.Y("name:N", sort="-x", title=None), tooltip=["name", "label", "low", "high"])
                    .properties(height=320)
                ),
                use_container_width=True,
            )
            for _, row in itineraries.head(4).iterrows():
                info(f"{row['name']} · {row['transport']}", f"{row['note']} {row['tip']} Core stops: {row['best_for']}.")

with map_tab:
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Places in view", len(f_places))
    m2.metric("Categories", f_places["category_label"].nunique() if not f_places.empty else 0)
    m3.metric("Open 24h", int(f_places["is_open_24h"].sum()) if "is_open_24h" in f_places.columns else 0)
    m4.metric("Free entry", int(f_places["is_free"].sum()) if "is_free" in f_places.columns else 0)
    left, right = st.columns([1.1, 0.9])
    with left:
        map_src = f_places.dropna(subset=["latitude", "longitude"])
        if not map_src.empty:
            if len(map_src) > 1500:
                map_src = map_src.sample(1500, random_state=7)
            st.altair_chart(
                chart_style(
                    alt.Chart(map_src)
                    .mark_circle(opacity=0.7)
                    .encode(
                        x="longitude:Q",
                        y="latitude:Q",
                        size=alt.Size("rating_score:Q", scale=alt.Scale(range=[20, 260]), title="Rating"),
                        color=alt.Color("category_label:N", title="Category"),
                        tooltip=["place_name", "category_label", "address", alt.Tooltip("rating_score:Q", format=".2f"), "is_open_24h", "is_free"],
                    )
                    .properties(height=410)
                ),
                use_container_width=True,
            )
    with right:
        cov = pd.DataFrame(
            {
                "metric": ["Website coverage", "Phone coverage", "Open 24h", "Free entry"],
                "count": [
                    int(places["website"].replace("", pd.NA).dropna().ne("N/A").sum()) if "website" in places.columns else 0,
                    int(places["phone"].replace("", pd.NA).dropna().ne("N/A").sum()) if "phone" in places.columns else 0,
                    int(places["is_open_24h"].sum()) if "is_open_24h" in places.columns else 0,
                    int(places["is_free"].sum()) if "is_free" in places.columns else 0,
                ],
            }
        )
        cov["share"] = cov["count"] / len(places) if len(places) else 0
        st.altair_chart(
            chart_style(
                alt.Chart(cov)
                .mark_bar(cornerRadiusEnd=5, color="#F07C5C")
                .encode(x=alt.X("share:Q", axis=alt.Axis(format="%"), title="Share"), y=alt.Y("metric:N", sort="-x", title=None), tooltip=["metric", "count", alt.Tooltip("share:Q", format=".1%")])
                .properties(height=230)
            ),
            use_container_width=True,
        )
        rated = f_places.dropna(subset=["rating_score"]).sort_values("rating_score", ascending=False).head(12)
        if not rated.empty:
            st.dataframe(rated[[c for c in ["place_name", "category_label", "rating_score", "address", "opening_hours", "price_level"] if c in rated.columns]], use_container_width=True)

with local_tab:
    st.markdown('<div class="section">Local travel intelligence</div>', unsafe_allow_html=True)
    if isinstance(local, dict) and local:
        sel = st.selectbox("State", sorted(local.keys()))
        state = local.get(sel, {})
        cols = st.columns([1.1, 0.9])
        with cols[0]:
            info("Language", str(state.get("language", "n/a")))
            phrases = state.get("phrases", [])
            if phrases:
                st.dataframe(pd.DataFrame(phrases, columns=["Local phrase", "English meaning"]), use_container_width=True)
            if state.get("food_specialties"):
                st.write("**Food specialties**")
                st.write(", ".join(state["food_specialties"]))
        with cols[1]:
            info("Transport tip", str(state.get("transport_tip", "n/a")))
            if state.get("scams_to_avoid"):
                st.write("**Scams to avoid**")
                for item in state["scams_to_avoid"]:
                    st.write(f"- {item}")
            if state.get("emergency"):
                em = state["emergency"]
                st.write("**Emergency contacts**")
                st.write(f"Tourist: {em.get('tourist', 'n/a')}")
                st.write(f"Police: {em.get('police', 'n/a')}")
                st.write(f"Ambulance: {em.get('ambulance', 'n/a')}")
    if cost:
        st.markdown('<div class="section">Travel cost benchmarks</div>', unsafe_allow_html=True)
        cc = st.columns(3)
        with cc[0]:
            info("Stay budget", f"Budget stays usually run from {fmt_currency(cost.get('stay', {}).get('budget', {}).get('low'))} to {fmt_currency(cost.get('stay', {}).get('budget', {}).get('high'))}.")
        with cc[1]:
            info("Food budget", f"Mid-range food usually lands around {fmt_currency(cost.get('food', {}).get('mid_range', {}).get('low'))} to {fmt_currency(cost.get('food', {}).get('mid_range', {}).get('high'))}.")
        with cc[2]:
            info("Transport", f"Road travel sits near {fmt_currency(cost.get('transport', {}).get('road_per_km'))} per km.")

with raw_tab:
    src = st.selectbox("Data source", ["places_dataset", "destinations", "itineraries", "local_intelligence", "cost_benchmarks", "dataset_stats"])
    if src == "places_dataset":
        st.dataframe(places.head(100), use_container_width=True)
    elif src == "destinations":
        st.dataframe(destinations.head(100), use_container_width=True)
    elif src == "itineraries":
        st.dataframe(itineraries.head(100), use_container_width=True)
    elif src == "local_intelligence":
        st.json(local)
    elif src == "cost_benchmarks":
        st.json(cost)
    else:
        st.json(stats)
    st.caption("This dashboard uses tourism data, not app-performance analytics.")
