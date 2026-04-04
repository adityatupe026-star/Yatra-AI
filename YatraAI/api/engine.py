from __future__ import annotations

import base64
import json
import math
import os
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

try:
    import ollama  # type: ignore
except Exception:  # pragma: no cover
    ollama = None


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "hackathon"
MODEL_NAME = os.getenv("OLLAMA_MODEL", "llama3.1:8b-instruct")


def _load_json(name: str, default: Any) -> Any:
    path = DATA_DIR / f"{name}.json"
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _normalize(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


DEFAULT_NUM_PREDICT = _safe_int(os.getenv("OLLAMA_NUM_PREDICT", "1600"), 1600)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(a))


class TravelEngine:
    def __init__(self) -> None:
        self.manifest = _load_json("manifest", {})
        self.destinations: List[Dict[str, Any]] = _load_json("destinations", [])
        self.itineraries: List[Dict[str, Any]] = _load_json("itineraries", [])
        self.local_intelligence: Dict[str, Any] = _load_json("local_intelligence", {})
        self.cost_benchmarks: Dict[str, Any] = _load_json("cost_benchmarks", {})
        self.generated_at = self.manifest.get("generated_at")
        self._by_name = {self._key(item.get("name")): item for item in self.destinations if item.get("name")}
        self._aliases = {
            "new delhi": "Delhi",
            "delhi ncr": "Delhi",
            "andaman and nicobar islands": "Andaman",
            "rann of kutch": "Rann of Kutch",
            "old delhi": "Delhi",
        }

    def _has_trip_context(self, context: Dict[str, Any]) -> bool:
        trip = context.get("trip")
        return isinstance(trip, dict) and bool(trip)

    def _estimate_trip_days(self, place: Optional[Dict[str, Any]]) -> int:
        if not isinstance(place, dict) or not place:
            return 2
        text = " ".join(
            str(place.get(key, ""))
            for key in ["name", "type", "region", "state", "blurb"]
        ).lower()
        if any(term in text for term in ["beach", "island", "hill", "trek", "wildlife", "heritage", "spiritual"]):
            return 3
        if any(term in text for term in ["city", "food", "shopping", "nightlife", "museum", "fort"]):
            return 2
        return 2

    def _estimate_budget_band(self, place: Optional[Dict[str, Any]], days: int) -> Dict[str, Any]:
        daily = _safe_int(place.get("average_daily_cost"), 3200) if isinstance(place, dict) else 3200
        return {
            "days": days,
            "daily": daily,
            "low": int(daily * days * 0.85),
            "high": int(daily * days * 1.25),
        }

    def _key(self, value: Any) -> str:
        return _normalize(value)

    def _find_destination(self, query: Any) -> Optional[Dict[str, Any]]:
        cleaned = self._key(query)
        if not cleaned:
            return None
        cleaned = self._key(self._aliases.get(cleaned, cleaned))
        if cleaned in self._by_name:
            return self._by_name[cleaned]
        for item in self.destinations:
            haystack = " ".join(
                [
                    item.get("name", ""),
                    item.get("state", ""),
                    item.get("region", ""),
                    item.get("description", ""),
                    " ".join(item.get("tags", [])),
                    " ".join(item.get("highlights", [])),
                ]
            ).lower()
            if cleaned and cleaned in haystack:
                return item
        return None

    def _prompt_interests(self, prompt: str, trip: Dict[str, Any]) -> List[str]:
        lowered = _normalize(prompt)
        mapped = [
            ("beach", "Beach"),
            ("beaches", "Beach"),
            ("culture", "Culture"),
            ("heritage", "Culture"),
            ("food", "Food"),
            ("eat", "Food"),
            ("romance", "Romance"),
            ("romantic", "Romance"),
            ("adventure", "Adventure"),
            ("nature", "Nature"),
            ("wildlife", "Wildlife"),
            ("spiritual", "Spiritual"),
            ("wellness", "Wellness"),
            ("shopping", "Shopping"),
            ("nightlife", "Nightlife"),
            ("luxury", "Luxury"),
            ("family", "Family"),
            ("photography", "Photography"),
            ("road trip", "Road Trip"),
        ]
        interests: List[str] = []
        for needle, label in mapped:
            if needle in lowered and label not in interests:
                interests.append(label)
        if isinstance(trip, dict):
            for item in trip.get("interests", []):
                if item and item not in interests:
                    interests.append(item)
        return interests[:5]

    def _format_recommendations(self, prompt: str, trip: Dict[str, Any]) -> str:
        interests = self._prompt_interests(prompt, trip)
        budget = _safe_int(trip.get("budget"), 0) if isinstance(trip, dict) else 0
        region = ""
        if isinstance(trip, dict):
            destination = trip.get("destination") or trip.get("place") or {}
            if isinstance(destination, dict):
                region = destination.get("region", "")
        picks = self.recommend(interests or ["Culture", "Food", "Nature"], budget=budget or None, limit=3, region=region or None)
        lines = [
            "**Best place picks**",
            "",
            "You do not need a generic list. These are the places that actually fit your vibe, then you can turn one of them into a route.",
            "",
        ]
        for place in picks[:3]:
            lines.extend([
                f"**{place['name']}**",
                f"- Why it fits: {place.get('blurb', 'It gives the trip a clear anchor.')}",
                f"- Best for: {', '.join(place.get('tags', [])[:3]) if place.get('tags') else 'balanced travel'}",
                f"- Highlights: {', '.join(place.get('highlights', [])[:3]) or 'Local highlights from the destination data'}",
                f"- Access: {place.get('airport', 'airport access not listed')}, {place.get('rail', 'rail access not listed')}, {place.get('road', 'road access not listed')}",
                f"- Season: {place.get('best_season', 'Year-round with seasonal planning')}",
                f"- Why YatraAI: it explains the fit, compares options and turns the choice into a usable route.",
                "",
            ])
        if not picks:
            lines.extend([
                "Try a clearer interest like beach, culture, romance, food or wildlife.",
                "Then I can return the best places and explain why they belong in the trip.",
                "",
            ])
        lines.append("Next step: tell me your budget, days and vibe, and I will turn this into a real trip plan.")
        return "\n".join(lines)

    def search_destinations(self, query: str, limit: int = 6) -> List[Dict[str, Any]]:
        cleaned = self._key(query)
        scored: List[Tuple[int, Dict[str, Any]]] = []
        for item in self.destinations:
            score = 0
            name = self._key(item.get("name"))
            state = self._key(item.get("state"))
            haystack = " ".join(
                [
                    item.get("name", ""),
                    item.get("state", ""),
                    item.get("region", ""),
                    item.get("description", ""),
                    " ".join(item.get("tags", [])),
                    " ".join(item.get("highlights", [])),
                ]
            ).lower()
            if cleaned == name:
                score += 40
            if cleaned in state:
                score += 12
            if cleaned in haystack:
                score += 18
            for token in cleaned.split():
                if token in haystack:
                    score += 4
            if score:
                scored.append((score, item))
        scored.sort(key=lambda pair: (pair[0], pair[1].get("name", "")), reverse=True)
        return [item for _, item in scored[:limit]]

    def nearby_places(self, name: str, limit: int = 6) -> List[Dict[str, Any]]:
        anchor = self._find_destination(name)
        if not anchor:
            return []
        scored: List[Tuple[float, Dict[str, Any]]] = []
        for item in self.destinations:
            if item.get("name") == anchor.get("name"):
                continue
            if item.get("region") != anchor.get("region"):
                continue
            if not all(key in item for key in ("lat", "lng")):
                continue
            distance = _haversine_km(
                _safe_float(anchor["lat"]),
                _safe_float(anchor["lng"]),
                _safe_float(item["lat"]),
                _safe_float(item["lng"]),
            )
            scored.append((distance, item))
        if not scored:
            scored = [(0.0, item) for item in self.destinations if item.get("name") != anchor.get("name")]
        scored.sort(key=lambda pair: (pair[0], pair[1].get("name", "")))
        return [item for _, item in scored[:limit]]

    def recommend(
        self,
        interests: Iterable[str],
        budget: Optional[int] = None,
        limit: int = 6,
        region: Optional[str] = None,
        exclude: Optional[Iterable[str]] = None,
    ) -> List[Dict[str, Any]]:
        wanted = {self._key(item) for item in interests if item}
        excluded = {self._key(item) for item in (exclude or []) if item}
        region_key = self._key(region or "")
        scored: List[Tuple[int, Dict[str, Any]]] = []
        for item in self.destinations:
            name_key = self._key(item.get("name"))
            if name_key in excluded:
                continue
            if region_key and self._key(item.get("region")) != region_key:
                continue
            tags = {self._key(tag) for tag in item.get("tags", [])}
            score = len(tags & wanted) * 8
            if budget:
                daily = _safe_int(item.get("average_daily_cost"), 0)
                if budget < 2500 and daily <= 3200:
                    score += 4
                elif budget < 4500 and daily <= 4500:
                    score += 2
            if item.get("crowd_level") == "Low":
                score += 2
            scored.append((score, item))
        scored.sort(key=lambda pair: (pair[0], pair[1].get("name", "")), reverse=True)
        picks = [item for score, item in scored if score > 0]
        return (picks or self.destinations)[:limit]

    def place_payload(self, query: str) -> Dict[str, Any]:
        place = self._find_destination(query)
        if not place:
            return {"found": False, "query": query, "matches": self.search_destinations(query)}
        routes = [route for route in self.itineraries if route.get("destination") == place.get("name") or route.get("origin") == place.get("name")]
        days = self._estimate_trip_days(place)
        return {
            "found": True,
            "place": place,
            "state_info": self.local_intelligence.get(place.get("state"), {}),
            "nearby": self.nearby_places(place["name"]),
            "routes": routes[:4],
            "suggested_days": days,
            "suggested_budget": self._estimate_budget_band(place, days),
        }

    def _budget_breakdown(self, place: Dict[str, Any], days: int, mode: str) -> Dict[str, Any]:
        daily = max(1800, _safe_int(place.get("average_daily_cost"), 3200))
        transport_band = {"Air": (4200, 8200), "Train": (500, 1500), "Road": (1500, 3000)}.get(mode, (1500, 3000))
        stay_factor = 0.45 if daily < 3000 else 0.6 if daily < 4200 else 0.78
        stay_low = int(daily * days * stay_factor * 0.8)
        stay_high = int(daily * days * stay_factor * 1.2)
        food_low = 700 * days
        food_high = 1800 * days
        activity_low = 600 * days
        activity_high = 1500 * days
        return {
            "transport": {"low": transport_band[0], "high": transport_band[1]},
            "stay": {"low": stay_low, "high": stay_high},
            "food": {"low": food_low, "high": food_high},
            "activities": {"low": activity_low, "high": activity_high},
            "total": {
                "low": transport_band[0] + stay_low + food_low + activity_low,
                "high": transport_band[1] + stay_high + food_high + activity_high,
            },
        }

    def _packing_list(self, place: Dict[str, Any], interests: Iterable[str]) -> List[str]:
        items = ["Government ID", "Phone charger", "Power bank", "Comfortable walking shoes"]
        text = " ".join([place.get("region", ""), place.get("state", ""), " ".join(place.get("tags", [])), " ".join(interests)]).lower()
        if any(word in text for word in ["beach", "island", "goa", "andaman"]):
            items += ["Sunglasses", "Sunscreen", "Light cotton wear", "Flip-flops"]
        if any(word in text for word in ["hill", "himalaya", "leh", "ooty", "munnar", "coorg", "darjeeling", "gangtok"]):
            items += ["Light jacket", "Warm layer", "Moisturizer", "Closed shoes"]
        if any(word in text for word in ["adventure", "road trip", "wildlife"]):
            items += ["Reusable water bottle", "Offline maps", "Small first-aid kit"]
        if any(word in text for word in ["spiritual", "temple"]):
            items += ["Modest clothing", "Slip-on footwear"]
        return list(dict.fromkeys(items))

    def _day_plan(self, place: Dict[str, Any], days: int) -> List[Dict[str, str]]:
        highlights = place.get("highlights", []) or [place.get("name", "the destination")]
        food = self.local_intelligence.get(place.get("state"), {}).get("food_specialties", [])
        output: List[Dict[str, str]] = []
        for index in range(days):
            highlight = highlights[index % len(highlights)]
            next_highlight = highlights[(index + 1) % len(highlights)]
            food_pick = food[index % len(food)] if food else "local food"
            output.append(
                {
                    "day": index + 1,
                    "morning": f"Start with {highlight}.",
                    "afternoon": f"Use the middle of the day around {next_highlight}.",
                    "evening": f"Finish with {food_pick} and an easy walk.",
                }
            )
        return output

    def plan_trip(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        place = self._find_destination(payload.get("destination") or payload.get("query"))
        if not place:
            matches = self.search_destinations(payload.get("destination") or payload.get("query") or "")
            if matches:
                place = matches[0]
        if not place:
            raise ValueError("Destination not found")
        days = max(1, min(21, _safe_int(payload.get("days"), 3)))
        mode = payload.get("mode") or "Road"
        interests = [str(item) for item in payload.get("interests", []) if item]
        nearby = self.nearby_places(place["name"])
        budget = self._budget_breakdown(place, days, mode)
        local_info = self.local_intelligence.get(place.get("state"), {})
        return {
            "trip_title": f"{payload.get('start', 'India')} to {place['name']}",
            "destination": place,
            "days": days,
            "mode": mode,
            "interests": interests,
            "season": place.get("best_season", "Year-round with seasonal planning"),
            "why_this_plan": [
                f"{place['name']} fits {', '.join(interests[:3]) if interests else 'a balanced route'} well.",
                f"Best season: {place.get('best_season', 'Year-round with seasonal planning')}.",
                f"Crowd level: {place.get('crowd_level', 'Unknown')}.",
            ],
            "budget": budget,
            "packing": self._packing_list(place, interests),
            "itinerary": self._day_plan(place, days),
            "nearby": nearby[:5],
            "local_intelligence": local_info,
            "route_matches": [route for route in self.itineraries if route.get("destination") == place.get("name") or route.get("origin") == place.get("name")][:3],
            "share_token": base64.urlsafe_b64encode(
                json.dumps(
                    {
                        "start": payload.get("start"),
                        "destination": place["name"],
                        "days": days,
                        "mode": mode,
                    }
                ).encode("utf-8")
            ).decode("ascii"),
        }

    def optimize_plan(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        plan = dict(payload.get("plan") or {})
        objective = _normalize(payload.get("objective", "balance"))
        original_mode = plan.get("mode", "Road")
        suggested_mode = original_mode
        if objective in {"lower cost", "budget", "cheap"} and original_mode == "Air":
            suggested_mode = "Train"
        elif objective in {"less travel time", "faster", "quick"} and original_mode != "Air":
            suggested_mode = "Air"
        days = max(1, _safe_int(plan.get("days"), 3))
        place = plan.get("destination") or plan.get("place") or {}
        if not isinstance(place, dict):
            place = self._find_destination(place) or {}
        budget = self._budget_breakdown(place, days, suggested_mode) if isinstance(place, dict) and place else {}
        return {
            "objective": objective or "balance",
            "original_mode": original_mode,
            "suggested_mode": suggested_mode,
            "suggestion": "Keep one anchor meal, one anchor sight and one flexible buffer slot every day.",
            "budget": budget,
            "notes": [
                "Use a central stay to reduce transfer fatigue.",
                "Keep the first and last day light when travel distance is high.",
            ],
        }

    def simulate_trip(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        plan = dict(payload.get("plan") or {})
        days = max(1, _safe_int(plan.get("days"), 3))
        budget_total = _safe_int(plan.get("budget"), 12000)
        place = plan.get("destination") or plan.get("place") or {}
        if not isinstance(place, dict):
            place = self._find_destination(place) or {}
        season = place.get("best_season", "Year-round with seasonal planning") if isinstance(place, dict) else "Year-round with seasonal planning"
        timeline = []
        running_budget = 0.0
        for day in range(1, days + 1):
            running_budget += budget_total / max(days, 1)
            energy = max(42, 90 - (day - 1) * 8)
            weather = "Stable"
            if "June" in season or "July" in season or "August" in season:
                weather = "Expect rain buffers"
            elif "October" in season or "November" in season:
                weather = "Best travel window"
            timeline.append(
                {
                    "day": day,
                    "energy": energy,
                    "budget_used": round(running_budget),
                    "weather": weather,
                    "focus": "Sightseeing in the morning, slower lunch window, and a flexible evening." if day == 1 else "Keep the same rhythm and preserve one buffer slot.",
                }
            )
        return {"days": days, "season": season, "summary": "This simulation keeps the trip practical by spreading budget and energy across the route.", "timeline": timeline}

    def _ollama_chat(self, prompt: str, context: Dict[str, Any], response_mode: str = "trip", max_tokens: Optional[int] = None) -> Optional[str]:
        if os.getenv("YATRA_USE_OLLAMA", "").lower() not in {"1", "true", "yes"}:
            return None
        if ollama is None:
            return None
        try:
            trip = context.get("trip") if self._has_trip_context(context) else {}
            expert_mode = response_mode != "trip" or not trip
            if expert_mode:
                system_prompt = (
                    "You are YatraAI, an India travel and tourism expert. Answer without relying on trip context unless the user supplied it. "
                    "When the user names a city, district, or place, respond with the best tourist places in that location, why each place is worth visiting, "
                    "what to see, and how long a default visit should take. If budget or trip length are not given, propose a sensible default budget plan "
                    "and trip duration instead of asking the user to fill in the blanks. Keep the answer practical, specific, and grounded in the supplied data."
                )
            else:
                system_prompt = (
                    "You are YatraAI, a travel planner for India. Use the supplied trip context and keep answers grounded. "
                    "Be specific about actual destinations, why they fit, what to see, when to go, where to stay, "
                    "what food or nearby places matter, and why the user should trust this route. "
                    "Write in clear sections and aim for detailed answers with 12 or more useful lines when the user asks for guidance. "
                    "If the user asks where to go, name actual places first and explain why each one fits the trip."
                )
            num_predict = max(512, _safe_int(max_tokens, DEFAULT_NUM_PREDICT))
            place = self._find_destination(prompt)
            trip_hint = ""
            if isinstance(place, dict):
                days = self._estimate_trip_days(place)
                budget = self._estimate_budget_band(place, days)
                trip_hint = (
                    f"\nSuggested trip defaults if the user did not provide them:\n"
                    f"- Trip length: {days} days\n"
                    f"- Budget range: Rs.{budget['low']} to Rs.{budget['high']}\n"
                    f"- Reasoning cue: {place.get('blurb', 'Use the destination itself as the anchor and build around its main highlights.')}\n"
                )
            response = ollama.chat(
                model=MODEL_NAME,
                options={
                    "num_predict": num_predict,
                    "temperature": 0.3,
                },
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": (
                        "Context: "
                        f"{json.dumps(context, ensure_ascii=False)}\n\n"
                        f"{trip_hint}"
                        "Respond with the actual destination names from the context when relevant. "
                        "If the user gave only a city or place, start with the best tourist places in that city/place, then explain why they matter, "
                        "what to see, how long to stay, and what budget to expect if not already provided.\n\n"
                        f"User prompt: {prompt}"
                    )},
                ],
            )
            return response["message"]["content"].strip()
        except Exception:
            return None

    def chat(self, prompt: str, context: Optional[Dict[str, Any]] = None, response_mode: str = "expert", max_tokens: Optional[int] = None) -> Dict[str, Any]:
        context = context or {}
        if response_mode != "trip":
            context = {key: value for key, value in context.items() if key != "trip"}
        trip = context.get("trip") or {}
        allow_trip_flow = response_mode == "trip" and bool(trip)
        place_name = ""
        if isinstance(trip, dict):
            destination = trip.get("destination") or trip.get("place") or {}
            if isinstance(destination, dict):
                place_name = destination.get("name", "")
        place = self._find_destination(place_name or prompt)
        if not place and isinstance(trip, dict) and trip.get("destination"):
            place = self._find_destination(trip.get("destination"))

        if (llm := self._ollama_chat(prompt, context, response_mode, max_tokens=max_tokens)) is not None:
            return {"response": llm, "intent": "llm", "place": place}

        lowered = _normalize(prompt)
        if allow_trip_flow and any(term in lowered for term in ["optimize", "better", "improve", "reduce cost", "less travel time"]):
            result = self.optimize_plan({"plan": trip, "objective": lowered})
            return {"response": self._format_optimize(result), "intent": "optimize", "place": place, "result": result}
        if allow_trip_flow and any(term in lowered for term in ["simulate", "day by day", "walk me through"]):
            result = self.simulate_trip({"plan": trip})
            return {"response": self._format_simulation(result, place), "intent": "simulate", "place": place, "result": result}
        if not place and any(term in lowered for term in ["where should i go", "where to go", "recommend", "suggest", "best place", "trip idea", "i prefer", "i want", "choose a destination"]):
            return {"response": self._format_recommendations(prompt, trip), "intent": "recommend", "place": place}
        if any(term in lowered for term in ["weather", "season", "best time", "when should i go"]):
            return {"response": self._format_weather(place, trip), "intent": "weather", "place": place}
        if any(term in lowered for term in ["budget", "cost", "cheap", "expenses"]):
            return {"response": self._format_budget(place, trip), "intent": "budget", "place": place}
        if any(term in lowered for term in ["food", "eat", "restaurant", "cafe"]):
            return {"response": self._format_food(place, trip), "intent": "food", "place": place}
        if any(term in lowered for term in ["packing", "carry", "what should i bring"]):
            return {"response": self._format_packing(place, trip), "intent": "packing", "place": place}
        if any(term in lowered for term in ["near", "nearby", "around", "close to"]):
            return {"response": self._format_nearby(place), "intent": "nearby", "place": place}
        if any(term in lowered for term in ["why", "tell me why", "explain this plan"]):
            return {"response": self._format_why(place, trip), "intent": "why", "place": place}
        if place:
            return {"response": self._format_place_overview(place, trip), "intent": "overview", "place": place}
        return {"response": self._format_generic(trip), "intent": "general", "place": place}

    def _format_place_overview(self, place: Dict[str, Any], trip: Dict[str, Any]) -> str:
        nearby = self.nearby_places(place["name"])
        state_info = self.local_intelligence.get(place.get("state"), {})
        highlights = place.get("highlights", [])[:3]
        daily_cost = place.get("average_daily_cost")
        trip_days = self._estimate_trip_days(place)
        budget = self._estimate_budget_band(place, trip_days)
        stay_tip = state_info.get("stay_tip", "Use a central stay to cut transfer time.")
        food_angle = state_info.get("food_angle", "Pair one local meal with one relaxed evening stop.")
        pieces = [
            f"**{place['name']}** is a strong fit for a {', '.join(place.get('tags', [])[:3]).lower()} trip.",
            f"It sits in **{place.get('state')}** and works best as a {place.get('type', 'travel stop')}.",
            f"Why people go: {place.get('blurb', 'It gives the trip a clear visual identity and an easy route anchor.')}",
            f"Best season: {place.get('best_season', 'Year-round with seasonal planning')}.",
            f"Suggested trip length: {trip_days} days.",
            f"Suggested budget if the user does not provide one: Rs.{budget['low']} to Rs.{budget['high']}.",
            f"Top highlights: {', '.join(highlights) if highlights else 'Local highlights from the destination data.'}",
            f"Best for: {', '.join(place.get('tags', [])[:3]) if place.get('tags') else 'balanced travel'} travelers.",
            f"Stay vibe: {stay_tip}",
            f"Food angle: {food_angle}",
            f"Access: {place.get('airport', 'airport access not listed')}, {place.get('rail', 'rail access not listed')}, {place.get('road', 'road access not listed')}.",
            f"Nearby route ideas: {', '.join(item.get('name', '') for item in nearby[:3]) or 'Other close places in the same region.'}",
            f"Budget cue: {daily_cost if daily_cost else 'Use the planner budget ranges for a realistic estimate.'}",
            f"Route cue: keep one anchor place and one nearby stop so the trip feels complete.",
            f"Why YatraAI: it turns a place into a route, so users get the reason, timing and nearby logic instead of a generic list.",
        ]
        if nearby:
            pieces.append(f"Nearby places: {', '.join(item.get('name', '') for item in nearby[:3])}.")
        if state_info.get("transport_tip"):
            pieces.append(f"Local tip: {state_info['transport_tip']}")
        if trip:
            pieces.append(f"Current trip context: {trip.get('start', 'your starting city')} to {place['name']}.")
        return "\n\n".join(pieces)

    def _format_weather(self, place: Optional[Dict[str, Any]], trip: Dict[str, Any]) -> str:
        if not place:
            return "Share a destination and I can tell you the best season and weather buffers."
        state_info = self.local_intelligence.get(place.get("state"), {})
        return (
            f"**Weather / season guidance for {place['name']}**\n\n"
            f"- Best season: {place.get('best_season', 'Year-round with seasonal planning')}\n"
            f"- Local note: {state_info.get('transport_tip', 'Keep one flexible buffer slot in the route.')}\n"
            f"- Packing cue: {', '.join(self._packing_list(place, trip.get('interests', []))[:4])}."
        )

    def _format_budget(self, place: Optional[Dict[str, Any]], trip: Dict[str, Any]) -> str:
        if not place:
            return "Share a destination and I can estimate transport, stay, food and activity costs."
        breakdown = self._budget_breakdown(place, max(1, _safe_int(trip.get("days"), 3)), trip.get("mode", "Road"))
        return (
            f"**Budget guide for {place['name']}**\n\n"
            f"- Transport: Rs.{breakdown['transport']['low']} to Rs.{breakdown['transport']['high']}\n"
            f"- Stay: Rs.{breakdown['stay']['low']} to Rs.{breakdown['stay']['high']}\n"
            f"- Food: Rs.{breakdown['food']['low']} to Rs.{breakdown['food']['high']}\n"
            f"- Activities: Rs.{breakdown['activities']['low']} to Rs.{breakdown['activities']['high']}\n"
            f"- Total band: Rs.{breakdown['total']['low']} to Rs.{breakdown['total']['high']}"
            f"\n- Why it matters: {place.get('blurb', 'This destination gives you a clear trip anchor and a practical planning band.')}"
        )

    def _format_food(self, place: Optional[Dict[str, Any]], trip: Dict[str, Any]) -> str:
        if not place:
            return "Share a destination and I'll suggest the most relevant local food angle."
        foods = self.local_intelligence.get(place.get("state"), {}).get("food_specialties", [])[:3]
        food_line = ", ".join(foods) if foods else "local street food and a signature meal"
        first_highlight = (place.get("highlights") or ["one landmark"])[0]
        return (
            f"**Food plan for {place['name']}**\n\n"
            f"- Try: {food_line}\n"
            f"- Add one premium dinner stop and one relaxed local lunch.\n"
            f"- Pair meals with {first_highlight} so the day stays efficient."
            f"\n- Why use YatraAI here: it helps turn food into route design, not just a random restaurant list."
        )

    def _format_packing(self, place: Optional[Dict[str, Any]], trip: Dict[str, Any]) -> str:
        if not place:
            return "Share a destination and I'll build a packing list."
        items = self._packing_list(place, trip.get("interests", []))[:8]
        return "**Packing list**\n\n" + "\n".join(f"- {item}" for item in items)

    def _format_nearby(self, place: Optional[Dict[str, Any]]) -> str:
        if not place:
            return "Share a destination and I'll suggest nearby spots."
        nearby = self.nearby_places(place["name"])
        lines = [f"- {item.get('name')} - {item.get('highlights', [''])[0]}" for item in nearby[:5]]
        lines.append("- Use these as route add-ons so the trip feels planned, not scattered.")
        lines.append("- This is where YatraAI is useful: it clusters places that actually fit together.")
        return "**Nearby picks**\n\n" + "\n".join(lines)

    def _format_why(self, place: Optional[Dict[str, Any]], trip: Dict[str, Any]) -> str:
        if not place:
            return "I need a destination or current trip to explain why it works."
        interests = trip.get("interests", [])
        nearby = self.nearby_places(place["name"])[:3]
        lines = [
            f"{place['name']} matches your interests: {', '.join(interests[:3]) if interests else 'a balanced route'}.",
            f"Best season: {place.get('best_season', 'Year-round with seasonal planning')}.",
            f"Highlights: {', '.join(place.get('highlights', [])[:3])}.",
            f"Nearby places: {', '.join(item.get('name', '') for item in nearby) or 'Other regional options'}.",
            f"Use case: this works when you want a route, not just a destination name.",
            f"Reason to trust it: the answer is based on your trip context, region, access, and budget band.",
            f"Why use YatraAI: it shows what to do, where to stay, what to pair nearby and why this place belongs in the trip.",
        ]
        return "**Why this plan works**\n\n" + "\n".join(f"- {line}" for line in lines)

    def _format_optimize(self, result: Dict[str, Any]) -> str:
        return (
            "**Optimization suggestion**\n\n"
            f"- Suggested mode: {result.get('suggested_mode', 'Road')}\n"
            f"- Main idea: {result.get('suggestion', 'Keep one anchor meal, one anchor sight and one flexible buffer slot every day.')}\n"
            "- Follow-up: keep the stay central and reduce transfer changes."
        )

    def _format_simulation(self, simulation: Dict[str, Any], place: Optional[Dict[str, Any]]) -> str:
        place_name = place.get("name") if place else "this trip"
        lines = [f"**Trip simulation for {place_name}**", "", simulation.get("summary", "")]
        for item in simulation.get("timeline", []):
            lines.append(f"- Day {item['day']}: energy {item['energy']}%, budget used Rs.{item['budget_used']}, {item['weather']}")
        return "\n".join(lines)

    def _format_generic(self, trip: Dict[str, Any]) -> str:
        current = ""
        if trip:
            destination = trip.get("destination")
            if isinstance(destination, dict):
                destination = destination.get("name", "your destination")
            current = f"\n\nCurrent trip context: {trip.get('start', 'your starting city')} to {destination or 'your destination'}."
        return (
            "**Trip sketch**\n\n"
            "- Tell me a destination, city, or interest and I'll turn it into a grounded plan.\n"
            "- If you only give a city, I will suggest the best tourist places there and why they are worth visiting.\n"
            "- If budget or days are missing, I will give a practical default budget and trip length.\n"
            "- I can also help with weather, packing, food, nearby places and optimization.\n"
            "- I can compare 2 or 3 destinations and explain which one is better for your plan.\n"
            "- I can turn one city into a 2 to 5 day route with nearby stops and a realistic budget."
            f"{current}"
        )

    def manifest_summary(self) -> Dict[str, Any]:
        return {
            "generated_at": self.generated_at,
            "destination_count": len(self.destinations),
            "itinerary_count": len(self.itineraries),
            "states": sorted(self.local_intelligence.keys()),
        }


engine = TravelEngine()
