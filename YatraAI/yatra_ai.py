import math
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import ollama
import pandas as pd


INTEREST_TO_CATEGORIES = {
    "food": ["restaurant", "cafe"],
    "stay": ["hotel"],
    "health": ["hospital"],
    "shopping": ["shopping"],
    "nature": ["tourist_attraction"],
    "culture": ["tourist_attraction"],
    "tourist": ["tourist_attraction"],
    "adventure": ["tourist_attraction"],
    "transport": ["transport"],
}

INTEREST_KEYWORDS = {
    "food": ["food", "restaurant", "cafe", "eat", "dining"],
    "stay": ["stay", "hotel", "hostel", "apartment"],
    "health": ["health", "medical", "hospital", "clinic", "pharmacy"],
    "shopping": ["shopping", "mall", "market", "retail", "shop"],
    "nature": ["nature", "park", "garden", "green", "lake"],
    "culture": ["culture", "temple", "museum", "fort", "heritage", "monument"],
    "tourist": ["tourist", "sightseeing", "attraction", "visit", "trip"],
    "adventure": ["adventure", "trek", "camp", "ride", "activity"],
    "transport": ["transport", "station", "bus", "train", "metro"],
}

CATEGORY_PRIORITIES = {
    "tourist_attraction": 5,
    "restaurant": 4,
    "cafe": 3,
    "shopping": 2,
    "hotel": 2,
    "transport": 1,
    "hospital": 1,
}

PRICE_ESTIMATES = {
    "budget": 250,
    "mid-range": 700,
    "premium": 1800,
}

TIME_SLOTS = ["Morning", "Afternoon", "Evening"]
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
DATASET_DEFAULT = Path(__file__).resolve().parents[1] / "data" / "places_dataset.csv"


def normalize_text(value: object) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
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


def safe_int_match(pattern: str, text: str, default: int) -> int:
    match = re.search(pattern, text, re.IGNORECASE)
    return int(match.group(1)) if match else default


@dataclass
class UserProfile:
    budget: Optional[int] = None
    interests: List[str] = field(default_factory=list)
    travel_type: Optional[str] = None


def load_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.columns = [col.lower().strip() for col in df.columns]

    string_columns = [
        "place_id",
        "place_name",
        "category",
        "subcategory",
        "address",
        "tags",
        "source",
        "website",
        "phone",
        "opening_hours",
        "cuisine",
        "description",
        "wheelchair",
        "fee",
        "image",
        "price_level",
        "category_label",
    ]
    for column in string_columns:
        if column in df.columns:
            df[column] = df[column].apply(normalize_text)

    if "is_free" in df.columns:
        df["is_free"] = df["is_free"].fillna(False).astype(bool)
    if "is_open_24h" in df.columns:
        df["is_open_24h"] = df["is_open_24h"].fillna(False).astype(bool)

    df["price_level"] = df["price_level"].replace("", "budget")
    df["search_text"] = (
        df["place_name"]
        + " "
        + df["category"]
        + " "
        + df["subcategory"]
        + " "
        + df["tags"]
        + " "
        + df["description"]
        + " "
        + df["address"]
    ).str.lower()
    return df


class PlacesDB:
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()

    def infer_supported_region(self) -> str:
        addresses = self.df["address"].dropna().astype(str)
        if addresses.str.contains("Pune", case=False, na=False).any():
            return "Pune and nearby Maharashtra destinations"
        return "the dataset coverage area"

    def detect_interests(self, message: str) -> List[str]:
        lowered = message.lower()
        detected = []
        for interest, keywords in INTEREST_KEYWORDS.items():
            if any(keyword in lowered for keyword in keywords):
                detected.append(interest)
        return detected

    def apply_budget_filter(self, df: pd.DataFrame, budget: Optional[int]) -> pd.DataFrame:
        if not budget:
            return df
        if budget <= 1500:
            return df[(df["is_free"]) | (df["price_level"].isin(["budget"]))]
        if budget <= 4000:
            return df[df["price_level"].isin(["budget", "mid-range"])]
        return df

    def search_places(self, query: str, limit: int = 5) -> pd.DataFrame:
        cleaned = query.lower().strip()
        if not cleaned:
            return self.df.head(0)

        direct = self.df[self.df["place_name"].str.lower().str.contains(re.escape(cleaned), na=False)]
        if not direct.empty:
            return direct.head(limit)

        keywords = [token for token in re.split(r"[^a-z0-9]+", cleaned) if len(token) > 2]
        if not keywords:
            return self.df.head(0)

        pattern = "|".join(re.escape(token) for token in keywords)
        matched = self.df[self.df["search_text"].str.contains(pattern, na=False, regex=True)].copy()
        if matched.empty:
            return matched

        matched["match_score"] = matched["search_text"].apply(
            lambda value: sum(token in value for token in keywords)
        )
        matched["priority"] = matched["category"].map(CATEGORY_PRIORITIES).fillna(0)
        return matched.sort_values(["match_score", "priority"], ascending=False).head(limit)

    def recommend_places(
        self,
        interests: List[str],
        budget: Optional[int],
        limit: int = 12,
        exclude: Optional[set] = None,
    ) -> pd.DataFrame:
        exclude = exclude or set()
        categories = []
        for interest in interests:
            categories.extend(INTEREST_TO_CATEGORIES.get(interest, []))
        categories = categories or ["tourist_attraction", "restaurant", "cafe"]

        filtered = self.df[self.df["category"].isin(categories)].copy()
        filtered = self.apply_budget_filter(filtered, budget)
        filtered = filtered[~filtered["place_name"].isin(exclude)].copy()

        filtered["priority"] = filtered["category"].map(CATEGORY_PRIORITIES).fillna(0)
        filtered["described"] = filtered["description"].str.len().fillna(0)
        filtered["has_address"] = filtered["address"].str.len().fillna(0)
        return filtered.sort_values(
            ["priority", "described", "has_address", "place_name"], ascending=False
        ).head(limit)

    def nearby_places(
        self,
        anchor_query: str,
        interests: Optional[List[str]] = None,
        limit: int = 5,
    ) -> Tuple[Optional[pd.Series], pd.DataFrame]:
        anchor_df = self.search_places(anchor_query, limit=1)
        if anchor_df.empty:
            return None, anchor_df

        anchor = anchor_df.iloc[0]
        candidates = self.df[
            (self.df["place_id"] != anchor["place_id"])
            & (self.df["place_name"].str.lower() != str(anchor["place_name"]).lower())
        ].copy()

        if interests:
            categories = []
            for interest in interests:
                categories.extend(INTEREST_TO_CATEGORIES.get(interest, []))
            if categories:
                candidates = candidates[candidates["category"].isin(categories)]

        candidates["distance_km"] = candidates.apply(
            lambda row: haversine_km(
                anchor["latitude"],
                anchor["longitude"],
                row["latitude"],
                row["longitude"],
            ),
            axis=1,
        )
        candidates["priority"] = candidates["category"].map(CATEGORY_PRIORITIES).fillna(0)
        nearby = candidates.sort_values(["distance_km", "priority"], ascending=[True, False]).head(limit)
        return anchor, nearby

    def emergency_places(self, limit: int = 6) -> pd.DataFrame:
        emergency = self.df[self.df["category"].isin(["hospital"])].copy()
        emergency = emergency[
            emergency["place_name"].str.contains(
                "hospital|clinic|medical|medico|nursing|care|dental|pharmacy",
                na=False,
                case=False,
            )
            | emergency["search_text"].str.contains(
                "hospital|clinic|medical|medico|nursing|care|dental|pharmacy",
                na=False,
            )
        ].copy()
        emergency = emergency[emergency["address"].str.len().fillna(0) > 0].copy()
        emergency["described"] = emergency["description"].str.len().fillna(0)
        emergency["has_address"] = emergency["address"].str.len().fillna(0)
        return emergency.sort_values(["described", "has_address", "place_name"], ascending=False).head(limit)

    def place_overview_context(self, place_name: str) -> Optional[Dict[str, str]]:
        result = self.search_places(place_name, limit=1)
        if result.empty:
            return None

        row = result.iloc[0]
        trip_days = 3 if any(term in str(row["search_text"]) for term in ["beach", "hill", "heritage", "spiritual", "wildlife"]) else 2
        try:
            daily = int(row.get("average_daily_cost") or 3200)
        except Exception:
            daily = 3200
        budget_low = int(max(1800, daily) * trip_days * 0.85)
        budget_high = int(max(1800, daily) * trip_days * 1.25)
        return {
            "place_name": row["place_name"],
            "category": row["category_label"] or row["category"],
            "subcategory": row["subcategory"],
            "address": row["address"] or "Address not available",
            "opening_hours": row["opening_hours"] or "Opening hours not available",
            "price_level": row["price_level"] or "budget",
            "is_free": "Yes" if row["is_free"] else "No",
            "description": row["description"] or "",
            "tags": row["tags"] or "",
            "website": row["website"] or "Not available",
            "phone": row["phone"] or "Not available",
            "suggested_days": f"{trip_days}",
            "suggested_budget": f"Rs.{budget_low} to Rs.{budget_high}",
        }


class OllamaTravelAgent:
    def __init__(self, data_path: Path, model: str = DEFAULT_MODEL):
        self.model = model
        self.data_path = Path(data_path)
        self.db = PlacesDB(load_data(self.data_path))
        self.profile = UserProfile()
        self.region = self.db.infer_supported_region()

    def ask_llm(self, system_prompt: str, user_prompt: str) -> str:
        response = ollama.chat(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response["message"]["content"].strip()

    def extract_preferences(self, message: str) -> None:
        budget = re.search(r"(?:budget|under|around)\s*[₹rs\.\s]*([0-9]{3,6})", message, re.IGNORECASE)
        if budget:
            self.profile.budget = int(budget.group(1))

        interests = self.db.detect_interests(message)
        if interests:
            self.profile.interests = list(dict.fromkeys(interests))

        travel_type_match = re.search(
            r"(solo|family|friends|couple|luxury|budget|backpacking|road trip)",
            message,
            re.IGNORECASE,
        )
        if travel_type_match:
            self.profile.travel_type = travel_type_match.group(1).lower()

    def detect_intent(self, message: str) -> str:
        lowered = message.lower()
        if any(term in lowered for term in ["emergency", "ambulance", "hospital", "police", "help me"]):
            return "emergency"
        if any(term in lowered for term in ["how to go", "route", "road trip", "go from", "travel from"]):
            return "transport"
        if any(term in lowered for term in ["nearby", "near me", "near ", "closest "]):
            return "nearby"
        if any(term in lowered for term in ["overview", "tell me about", "about ", "describe "]):
            return "overview"
        if any(term in lowered for term in ["plan", "trip", "itinerary"]):
            return "trip"
        return "general"

    def extract_destination(self, message: str) -> str:
        match = re.search(r"(?:to|for|in|at)\s+([a-zA-Z][a-zA-Z\s\-]{1,40})", message, re.IGNORECASE)
        if match:
            destination = match.group(1).strip(" .?")
            destination = re.split(
                r"\b(under|around|for|with|budget|interest|interests|days|day)\b",
                destination,
                maxsplit=1,
                flags=re.IGNORECASE,
            )[0].strip(" ,.-")
            if destination:
                return destination
        return "Pune"

    def parse_trip_request(self, message: str) -> Dict[str, object]:
        days = safe_int_match(r"(\d+)\s*day", message, 2)
        budget = safe_int_match(r"(?:₹|rs\.?|inr)?\s*([0-9]{3,6})", message, self.profile.budget or 2500)
        interests = self.db.detect_interests(message) or self.profile.interests or ["tourist", "food", "culture"]
        destination = self.extract_destination(message)
        self.profile.budget = budget
        self.profile.interests = interests
        return {
            "destination": destination,
            "days": max(days, 1),
            "budget": budget,
            "interests": interests,
        }

    def build_overview_line(self, row: pd.Series) -> str:
        if row["description"]:
            return row["description"][:140].strip()
        pieces = [row["subcategory"], row["category_label"], row["tags"]]
        summary = ", ".join(piece for piece in pieces if piece)
        summary = summary.replace("|", ", ")
        return summary[:140] if summary else "Useful stop for your travel plan."

    def estimate_cost(self, row: pd.Series) -> int:
        if row["is_free"]:
            return 0
        return PRICE_ESTIMATES.get(row["price_level"], 250)

    def estimate_trip_days(self, place: Dict[str, Any]) -> int:
        text = " ".join(
            str(place.get(key, ""))
            for key in ["name", "type", "region", "state", "blurb"]
        ).lower()
        if any(term in text for term in ["beach", "island", "hill", "trek", "wildlife", "heritage", "spiritual"]):
            return 3
        if any(term in text for term in ["city", "food", "shopping", "nightlife", "museum", "fort"]):
            return 2
        return 2

    def estimate_budget_band(self, place: Dict[str, Any], days: int) -> Tuple[int, int]:
        try:
            daily = int(place.get("average_daily_cost") or 3200)
        except Exception:
            daily = 3200
        daily = max(1800, daily)
        low = int(daily * days * 0.85)
        high = int(daily * days * 1.25)
        return low, high

    def create_trip_plan(self, request: Dict[str, object]) -> Dict[str, object]:
        days = int(request["days"])
        budget = int(request["budget"])
        interests = list(request["interests"])
        recommendations = self.db.recommend_places(interests=interests, budget=budget, limit=days * 4 + 4)

        if recommendations.empty:
            recommendations = self.db.recommend_places(interests=["tourist", "food"], budget=None, limit=days * 4 + 4)

        itinerary = []
        used = set()
        total_estimated_cost = 0
        rows = recommendations.to_dict("records")
        row_index = 0

        for day in range(1, days + 1):
            day_items = []
            slot_interest_rotation = interests if interests else ["tourist", "food", "culture"]

            for slot in TIME_SLOTS:
                chosen = None
                while row_index < len(rows):
                    candidate = rows[row_index]
                    row_index += 1
                    if candidate["place_name"] in used:
                        continue
                    chosen = candidate
                    break

                if not chosen:
                    break

                used.add(chosen["place_name"])
                cost = self.estimate_cost(pd.Series(chosen))
                total_estimated_cost += cost
                day_items.append(
                    {
                        "slot": slot,
                        "place_name": chosen["place_name"],
                        "category": chosen["category_label"] or chosen["category"],
                        "overview": self.build_overview_line(pd.Series(chosen)),
                        "address": chosen["address"] or "Address not available",
                        "opening_hours": chosen["opening_hours"] or "Hours not available",
                        "cost": cost,
                        "is_free": chosen["is_free"],
                        "interest_hint": slot_interest_rotation[(len(day_items)) % len(slot_interest_rotation)],
                    }
                )

            itinerary.append({"day": day, "items": day_items})

        return {
            "request": request,
            "itinerary": itinerary,
            "estimated_total_cost": total_estimated_cost,
            "estimated_daily_budget": budget // days,
        }

    def render_trip_plan(self, plan: Dict[str, object]) -> str:
        request = plan["request"]
        itinerary = plan["itinerary"]
        lines = [
            f"Trip plan for {request['destination']} ({request['days']} days, budget Rs.{request['budget']})",
            f"Interests: {', '.join(request['interests'])}",
            f"Estimated spend from selected places: Rs.{plan['estimated_total_cost']}",
            f"Suggested daily budget: Rs.{plan['estimated_daily_budget']}",
            "",
        ]

        for day in itinerary:
            lines.append(f"Day {day['day']}:")
            if not day["items"]:
                lines.append("  No strong match found for this day in the dataset.")
                continue
            for item in day["items"]:
                cost_text = "Free" if item["is_free"] else f"Approx Rs.{item['cost']}"
                lines.append(
                    f"  {item['slot']}: {item['place_name']} ({item['category']}) | {cost_text}"
                )
                lines.append(f"    Overview: {item['overview']}")
                lines.append(f"    Address: {item['address']}")
                lines.append(f"    Hours: {item['opening_hours']}")
            lines.append("")

        system_prompt = (
            "You are YatraAI, an Indian travel assistant. Turn the itinerary data into a polished, practical "
            "travel plan. Keep it structured, mention why each place fits, and call out budget awareness. "
            "Do not invent places that are not in the provided context."
        )
        user_prompt = "\n".join(lines)
        return self.ask_llm(system_prompt, user_prompt)

    def handle_place_overview(self, message: str) -> str:
        place_query = re.sub(r"(?i)(tell me about|overview of|overview|describe|about)", "", message).strip(" .?")
        context = self.db.place_overview_context(place_query)
        if not context:
            return (
                f"I could not find '{place_query}' in the dataset. Try a place from {self.region}, "
                "for example a Pune attraction, cafe, restaurant, hotel, or shopping place."
            )

        system_prompt = (
            "You are a travel guide. Write a concise overview of the place using only the provided facts. "
            "Include what kind of place it is, why someone might visit, practical info, a suggested trip length, "
            "and a default budget range if the user did not provide one. Do not ask for budget or days unless the user wants a custom plan."
        )
        user_prompt = "\n".join(f"{key}: {value}" for key, value in context.items())
        return self.ask_llm(system_prompt, user_prompt)

    def handle_nearby(self, message: str) -> str:
        interests = self.db.detect_interests(message) or self.profile.interests
        anchor_match = re.search(r"(?:near|nearby to|closest to)\s+(.+)", message, re.IGNORECASE)
        anchor_query = anchor_match.group(1).strip(" .?") if anchor_match else "Pune"

        anchor, nearby = self.db.nearby_places(anchor_query=anchor_query, interests=interests, limit=5)
        if anchor is None or nearby.empty:
            return (
                "I could not determine the anchor place for nearby recommendations. "
                "Try something like 'places near Aga Khan Palace' or 'cafes near FC Road'."
            )

        lines = [f"Nearby recommendations around {anchor['place_name']}:"]
        for _, row in nearby.iterrows():
            overview = self.build_overview_line(row)
            lines.append(
                f"- {row['place_name']} ({row['category_label'] or row['category']}) | "
                f"{row['distance_km']:.1f} km away | {overview}"
            )
        return "\n".join(lines)

    def handle_transport(self, message: str) -> str:
        match = re.search(r"(?:from|go)\s+([a-zA-Z\s]+?)\s+(?:to)\s+([a-zA-Z\s]+)", message, re.IGNORECASE)
        if match:
            source = match.group(1).strip()
            destination = match.group(2).strip(" .?")
        else:
            parts = re.split(r"to", message, maxsplit=1, flags=re.IGNORECASE)
            source = "Pune"
            destination = parts[1].strip() if len(parts) > 1 else "your destination"

        system_prompt = (
            "You are a transport planning assistant for Indian travelers. Give a structured comparison with "
            "train, bus, cab, and self-drive options when relevant. Use approximate time and cost ranges, "
            "state that they are estimates, and give one recommendation based on convenience and budget."
        )
        user_prompt = (
            f"Route request: {source} to {destination}\n"
            f"Known service region: {self.region}\n"
            "Respond with bullet-style sections for Train, Bus, Cab, Self-drive, and Best Pick."
        )
        return self.ask_llm(system_prompt, user_prompt)

    def handle_emergency(self) -> str:
        emergency_df = self.db.emergency_places(limit=5)
        lines = [
            "Emergency support shortlist from the dataset:",
        ]
        for _, row in emergency_df.iterrows():
            lines.append(
                f"- {row['place_name']} ({row['category_label'] or row['category']}) | "
                f"{row['address'] or 'Address not available'} | Phone: {row['phone'] or 'Not available'}"
            )
        lines.append("Travel safety tip: in urgent situations, call local emergency services immediately and avoid isolated travel at night.")
        return "\n".join(lines)

    def handle_general(self, message: str) -> str:
        search_results = self.db.search_places(message, limit=5)
        context_lines = [
            f"Supported region: {self.region}",
            f"Saved preferences: budget={self.profile.budget}, interests={self.profile.interests}, travel_type={self.profile.travel_type}",
        ]
        if not search_results.empty:
            context_lines.append("Relevant places from dataset:")
            for _, row in search_results.iterrows():
                context_lines.append(
                    f"- {row['place_name']} | {row['category_label'] or row['category']} | "
                    f"{row['address'] or 'Address not available'} | {self.build_overview_line(row)}"
                )

        system_prompt = (
            "You are YatraAI, a travel assistant built on a local place dataset and Ollama. "
            "Answer naturally, stay travel-focused, and prefer the supplied dataset context. "
            "If the user gives only a city, suggest the best tourist places in that city, explain why they matter, "
            "and include a default trip length and budget if the user did not provide them."
        )
        user_prompt = "\n".join(context_lines + [f"User message: {message}"])
        return self.ask_llm(system_prompt, user_prompt)

    def chat(self, message: str) -> str:
        self.extract_preferences(message)
        intent = self.detect_intent(message)

        if intent == "trip":
            request = self.parse_trip_request(message)
            plan = self.create_trip_plan(request)
            return self.render_trip_plan(plan)
        if intent == "overview":
            return self.handle_place_overview(message)
        if intent == "nearby":
            return self.handle_nearby(message)
        if intent == "transport":
            return self.handle_transport(message)
        if intent == "emergency":
            return self.handle_emergency()
        return self.handle_general(message)


def main() -> None:
    dataset_path = Path(os.getenv("YATRA_DATASET", DATASET_DEFAULT))
    if not dataset_path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {dataset_path}. Set YATRA_DATASET to your CSV path."
        )

    agent = OllamaTravelAgent(dataset_path)
    print(f"YatraAI ready. Dataset: {dataset_path}")
    print(f"Ollama model: {agent.model}")
    print("Ask about trip plans, transport, nearby places, emergency help, or place overviews.")
    print("Type 'quit' to exit.\n")

    while True:
        message = input("You: ").strip()
        if message.lower() in {"quit", "exit"}:
            print("YatraAI: Safe travels.")
            break

        try:
            reply = agent.chat(message)
        except Exception as exc:
            reply = f"I hit an error while processing that request: {exc}"
        print(f"\nYatraAI: {reply}\n")


if __name__ == "__main__":
    main()
