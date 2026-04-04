from __future__ import annotations

import csv
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from YatraAI.api.analytics import TABLE_FILES, TABLE_SCHEMAS, ANALYTICS_DIR, create_id


ROOT = Path(__file__).resolve().parents[1]


def write_table(name: str, rows: list[dict[str, object]]) -> None:
    ANALYTICS_DIR.mkdir(parents=True, exist_ok=True)
    path = TABLE_FILES[name]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=TABLE_SCHEMAS[name])
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in TABLE_SCHEMAS[name]})


def make_seed_data() -> None:
    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    destinations = [
        "Goa", "Jaipur", "Udaipur", "Mumbai", "Delhi", "Leh", "Kochi", "Bengaluru",
        "Chennai", "Varanasi", "Kolkata", "Pune", "Lonavala", "Manali", "Mysuru",
    ]
    start_cities = ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Chennai", "Kolkata"]
    travel_modes = ["Air", "Road", "Train"]
    query_types = ["chat", "planner", "translate", "search"]
    context_modes = ["trip", "expert"]
    pages = {"chat": "chat", "planner": "planner", "translate": "translate", "search": "destinations"}
    target_languages = ["hi", "mr", "bn", "ta", "te", "kn", "ml", "gu", "pa", "ur", "or", "as", "kok"]
    source_languages = ["auto", "en", "hi", "mr", "bn", "ta", "te", "kn"]
    devices = ["mobile", "desktop"]

    sessions: list[dict[str, object]] = []
    queries: list[dict[str, object]] = []
    intents: list[dict[str, object]] = []
    recommendations: list[dict[str, object]] = []
    interactions: list[dict[str, object]] = []
    conversions: list[dict[str, object]] = []
    translations: list[dict[str, object]] = []
    chat_messages: list[dict[str, object]] = []
    events: list[dict[str, object]] = []

    # sessions
    for i in range(180):
        session_id = f"sess_{i + 1:04d}"
        sessions.append(
            {
                "session_id": session_id,
                "user_id": f"user_{(i % 48) + 1:03d}",
                "started_at": (now - timedelta(days=30, minutes=i * 13)).isoformat(),
                "ended_at": (now - timedelta(days=30, minutes=i * 13 - rng.randint(4, 120))).isoformat(),
                "device_type": rng.choice(devices),
                "platform": "web",
                "source_page": rng.choice(["home", "chat", "planner", "translate", "destinations"]),
                "country": "India",
                "city": rng.choice(start_cities),
                "app_version": "1.0.0",
            }
        )

    # queries and related tables
    for i in range(780):
        query_type = query_types[i % len(query_types)]
        session_id = sessions[i % len(sessions)]["session_id"]
        destination = destinations[(i * 3) % len(destinations)]
        start_city = start_cities[i % len(start_cities)]
        mode = travel_modes[i % len(travel_modes)]
        prompt = {
            "chat": f"Tell me about {destination} and nearby food spots.",
            "planner": f"Plan a {(i % 6) + 2} day trip from {start_city} to {destination} under Rs.{3000 + (i % 8) * 1000}.",
            "translate": f"Translate a travel phrase for {destination}.",
            "search": f"Search trips for {destination} and nearby places.",
        }[query_type]
        query_id = f"query_{i + 1:05d}"
        trip_mode = context_modes[i % len(context_modes)] if query_type == "chat" else ""
        queries.append(
            {
                "query_id": query_id,
                "session_id": session_id,
                "user_id": f"user_{(i % 48) + 1:03d}",
                "query_type": query_type,
                "raw_query": prompt,
                "source": f"{query_type}_input",
                "page": pages[query_type],
                "timestamp": (now - timedelta(days=30, minutes=i * 7)).isoformat(),
                "language": "en-IN" if query_type == "chat" else ("auto" if query_type == "translate" else "en"),
                "trip_mode": trip_mode,
                "destination_hint": destination,
                "budget_hint": 3000 + (i % 8) * 1000 if query_type == "planner" else "",
                "days_hint": (i % 6) + 2 if query_type == "planner" else "",
            }
        )

        intents.append(
            {
                "intent_id": create_id("intent"),
                "query_id": query_id,
                "session_id": session_id,
                "destination": destination,
                "start_city": start_city if query_type == "planner" else "",
                "budget": 3000 + (i % 8) * 1000 if query_type == "planner" else "",
                "days": (i % 6) + 2 if query_type == "planner" else "",
                "travel_type": rng.choice(["solo", "family", "friends", "couple"]),
                "mood": rng.choice(["balanced", "luxury", "budget", "adventure"]),
                "preferences": ", ".join(rng.sample(["beach", "food", "culture", "nature", "nightlife", "heritage"], 3)),
                "language_target": rng.choice(target_languages) if query_type == "translate" else "",
                "confidence": round(0.68 + (i % 20) * 0.015, 2),
                "parsed_at": (now - timedelta(days=30, minutes=i * 7 - 2)).isoformat(),
            }
        )

        top_pick = destination if query_type != "translate" else rng.choice(target_languages)
        recommendations.append(
            {
                "rec_id": create_id("rec"),
                "query_id": query_id,
                "session_id": session_id,
                "recommendation_type": {"chat": "chat_answer", "planner": "plan", "translate": "translation_result", "search": "place_list"}[query_type],
                "top_pick": top_pick,
                "all_picks": " | ".join([destination, rng.choice(destinations), rng.choice(destinations)]),
                "estimated_cost": 2500 + (i % 9) * 700 if query_type == "planner" else "",
                "estimated_days": (i % 6) + 2 if query_type == "planner" else "",
                "ai_mode": trip_mode or ("expert" if i % 5 == 0 else "trip"),
                "created_at": (now - timedelta(days=30, minutes=i * 7 - 1)).isoformat(),
            }
        )

        interactions.append(
            {
                "interaction_id": f"interaction_{i + 1:05d}",
                "session_id": session_id,
                "query_id": query_id,
                "event_type": rng.choice(["click", "copy", "open", "play_speech", "save_plan", "translate_again", "dismiss"]),
                "entity_type": {"chat": "button", "planner": "plan", "translate": "translation", "search": "destination"}[query_type],
                "entity_value": destination,
                "timestamp": (now - timedelta(days=30, minutes=i * 7 + 1)).isoformat(),
                "page": pages[query_type],
                "meta": f"mode={trip_mode or 'expert'}",
            }
        )

        if query_type == "planner" and i % 3 == 0:
            conversions.append(
                {
                    "conversion_id": f"conversion_{i + 1:05d}",
                    "session_id": session_id,
                    "query_id": query_id,
                    "converted": "true",
                    "conversion_type": rng.choice(["plan_saved", "route_exported", "destination_selected"]),
                    "final_destination": destination,
                    "final_budget": 3000 + (i % 8) * 1000,
                    "final_days": (i % 6) + 2,
                    "feedback_score": round(3.5 + (i % 5) * 0.3, 1),
                    "feedback_text": rng.choice(["good plan", "saved for later", "great detail", "useful recommendations"]),
                    "converted_at": (now - timedelta(days=30, minutes=i * 7 + 3)).isoformat(),
                }
            )

        if query_type == "translate":
            translations.append(
                {
                    "translation_id": f"translation_{i + 1:05d}",
                    "session_id": session_id,
                    "query_id": query_id,
                    "source_language": rng.choice(source_languages),
                    "target_language": rng.choice(target_languages),
                    "input_text": prompt,
                    "translated_text": f"Translated phrase for {destination}.",
                    "provider": "Google Cloud Translation",
                    "used_speech_output": "true" if i % 4 == 0 else "false",
                    "copied": "true" if i % 5 == 0 else "false",
                    "timestamp": (now - timedelta(days=30, minutes=i * 7 + 2)).isoformat(),
                }
            )

        if query_type == "chat":
            chat_messages.append(
                {
                    "message_id": f"msg_user_{i + 1:05d}",
                    "session_id": session_id,
                    "query_id": query_id,
                    "role": "user",
                    "message_text": prompt,
                    "response_mode": trip_mode or "expert",
                    "intent": "user_prompt",
                    "timestamp": (now - timedelta(days=30, minutes=i * 7)).isoformat(),
                }
            )
            chat_messages.append(
                {
                    "message_id": f"msg_assistant_{i + 1:05d}",
                    "session_id": session_id,
                    "query_id": query_id,
                    "role": "assistant",
                    "message_text": f"Advice for {destination}.",
                    "response_mode": trip_mode or "expert",
                    "intent": rng.choice(["overview", "budget", "food", "nearby", "weather"]),
                    "timestamp": (now - timedelta(days=30, minutes=i * 7 + 1)).isoformat(),
                }
            )

        events.append(
            {
                "timestamp": (now - timedelta(days=30, minutes=i * 7)).isoformat(),
                "event_type": query_type,
                "page": pages[query_type],
                "session_id": session_id,
                "context_mode": trip_mode if query_type == "chat" else "",
                "prompt": prompt,
                "response": f"Generated {query_type} response for {destination}.",
                "start": start_city if query_type == "planner" else "",
                "destination": destination,
                "travel_mode": mode if query_type == "planner" else "",
                "source_language": rng.choice(source_languages) if query_type == "translate" else "",
                "target_language": rng.choice(target_languages) if query_type == "translate" else "",
                "text_length": len(prompt),
                "response_length": len(f"Generated {query_type} response for {destination}."),
                "notes": f"Seeded {query_type} event.",
            }
        )

    write_table("sessions", sessions)
    write_table("queries", queries)
    write_table("intent_parses", intents)
    write_table("recommendations", recommendations)
    write_table("interactions", interactions)
    write_table("conversions", conversions)
    write_table("translations", translations)
    write_table("chat_messages", chat_messages)
    write_table("events", events)


if __name__ == "__main__":
    make_seed_data()
    print(f"Seeded analytics tables in {ANALYTICS_DIR}")
