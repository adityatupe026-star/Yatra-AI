import { destinationPlaces } from "../data/site-data.js";
import { queryBackend } from "./ai.js";
import { findCoords, formatCurrency } from "./helpers.js";

const DATA_URLS = {
  hotels: new URL("../../../data/categories/hotel.csv", import.meta.url),
  places: new URL("../../../data/places_dataset_new.csv", import.meta.url),
};

let catalogCache = null;

function parseCsv(text) {
  const rows = [];
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  if (!lines.length) return rows;
  const headers = [];
  let current = "";
  let inQuotes = false;
  let row = [];
  const pushValue = () => {
    row.push(current);
    current = "";
  };
  const pushRow = () => {
    if (!headers.length) {
      headers.push(...row);
    } else if (row.length) {
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = row[index] ?? "";
      });
      rows.push(entry);
    }
    row = [];
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        pushValue();
        continue;
      }
      current += char;
    }
    if (inQuotes) {
      current += "\n";
      continue;
    }
    pushValue();
    pushRow();
  }
  return rows;
}

const clean = (value, fallback = "N/A") => {
  const text = String(value ?? "").trim();
  return text && text !== "N/A" && text !== "nan" ? text : fallback;
};

const STAY_NAME_BLOCKLIST = [
  "restaurant",
  "bar",
  "cafe",
  "dosa",
  "veg",
  "canteen",
  "bakery",
  "mess",
  "shop",
  "complex",
  "society",
  "apartment",
  "pg",
  "flat",
  "office",
  "center",
  "centre",
  "club house",
  "restaurant and bar",
];

const STAY_SUBCATEGORY_ALLOWLIST = new Set(["hotel", "guest_house", "resort", "lodge", "hostel", "motel", "inn"]);

function classifyStayType(row) {
  const subcategory = lower(row.subcategory);
  const name = lower(row.place_name);
  if (subcategory.includes("resort") || name.includes("resort")) return "resort";
  if (subcategory.includes("guest_house") || name.includes("guest house")) return "guest house";
  if (subcategory.includes("lodge") || name.includes("lodge")) return "lodge";
  if (subcategory.includes("hostel") || name.includes("hostel")) return "hostel";
  if (subcategory.includes("inn") || name.includes("inn")) return "inn";
  return "hotel";
}

function deriveStayName(row) {
  const rawName = clean(row.place_name, "");
  if (rawName && rawName !== "Stay") return rawName;
  const stayType = classifyStayType(row);
  const cityHint = clean(row.city, "") !== "N/A" ? clean(row.city, "") : "";
  const address = clean(row.address, "");
  const addressHint = address && address !== "Address not available"
    ? address.split(",")[0].trim()
    : "";
  const parts = [stayType.charAt(0).toUpperCase() + stayType.slice(1), addressHint || cityHint].filter(Boolean);
  return parts.join(" - ") || `Stay ${row.place_id || row.osm_id || "option"}`;
}

function isLikelyStayRow(row) {
  const subcategory = lower(row.subcategory);
  const name = lower(row.place_name);
  const combined = `${name} ${subcategory}`;
  const allowed = STAY_SUBCATEGORY_ALLOWLIST.has(subcategory) || [...STAY_SUBCATEGORY_ALLOWLIST].some((item) => subcategory.includes(item));
  const blocked = STAY_NAME_BLOCKLIST.some((keyword) => combined.includes(keyword));
  const looksLikeStay = /hotel|stay|inn|resort|lodge|guest house|guest_house|homestay|hostel|motel/i.test(combined);
  return (allowed || looksLikeStay) && !blocked;
}

const toNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const lower = (value) => String(value ?? "").toLowerCase();

const distanceKm = (aLat, aLng, bLat, bLng) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
};

function inferBudgetBand(value) {
  const price = lower(value);
  if (price.includes("luxury") || price.includes("premium")) return "luxury";
  if (price.includes("mid")) return "mid-range";
  return "budget";
}

function inferHotelRating(row) {
  const priceLevel = inferBudgetBand(row.price_level);
  const base = priceLevel === "luxury" ? 8.6 : priceLevel === "mid-range" ? 7.9 : 7.2;
  const sub = lower(row.subcategory);
  if (sub.includes("resort") || sub.includes("hotel")) return Math.min(9.6, base + 0.4);
  if (sub.includes("hostel") || sub.includes("apartment")) return Math.max(6.5, base - 0.4);
  return base;
}

function normalizeHotel(row) {
  const rating = row.rating_normalized ? toNumber(row.rating_normalized, 0) : inferHotelRating(row);
  return {
    id: row.place_id || row.osm_id || row.place_name,
    name: deriveStayName(row),
    rawName: clean(row.place_name, ""),
    stayType: classifyStayType(row),
    isLikelyStay: isLikelyStayRow(row),
    address: clean(row.address, "Address not available"),
    category: clean(row.category_label, "Hotel / Accommodation"),
    subcategory: clean(row.subcategory, "hotel"),
    tags: clean(row.tags, "accommodation|stay|lodging")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
    rating: Number(rating.toFixed(1)),
    reviews: Math.max(12, Math.round((rating * 17) + (toNumber(row.osm_id, 0) % 120))),
    budget: inferBudgetBand(row.price_level),
    priceLevel: clean(row.price_level, "budget"),
    why: clean(row.description, "Good access, simple planning and comfortable stay logistics."),
    phone: clean(row.phone, "N/A"),
    website: clean(row.website, "N/A"),
    openingHours: clean(row.opening_hours, "N/A"),
    image: clean(row.image, ""),
    lat: toNumber(row.latitude, 0),
    lng: toNumber(row.longitude, 0),
  };
}

function normalizePlace(row) {
  const category = lower(row.category);
  const budget = clean(row.budget, "budget").toLowerCase();
  const rating = Math.max(3.2, Math.min(5, toNumber(row.ratings, 0) / 2 || 3.8));
  return {
    id: row.place_id || row.place_name,
    name: clean(row.place_name, "Place"),
    address: clean(row.address, "Address not available"),
    category: clean(row.category_label || row.category, "Local place"),
    tags: clean(row.tags, "local|travel")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
    rating: Number(rating.toFixed(1)),
    reviews: Math.max(8, toNumber(row.reviews, 0)),
    budget,
    entryFee: clean(row.entry_fee, "0"),
    bestFor: clean(row.best_for, "single"),
    bestSeason: clean(row.best_season, "All season"),
    description: clean(row.description, "Useful local stop for the trip."),
    openingHours: clean(row.opening_hours, "N/A"),
    website: clean(row.website, "N/A"),
    phone: clean(row.phone, "N/A"),
    city: clean(row.city, "N/A"),
    state: clean(row.state, "N/A"),
    district: clean(row.district, "N/A"),
    lat: toNumber(row.latitude, 0),
    lng: toNumber(row.longitude, 0),
    categoryKey: category,
  };
}

async function loadCatalog() {
  if (catalogCache) return catalogCache;
  const [hotelText, placeText] = await Promise.all([
    fetch(DATA_URLS.hotels).then((response) => response.text()),
    fetch(DATA_URLS.places).then((response) => response.text()),
  ]);
  catalogCache = {
    hotels: parseCsv(hotelText).map(normalizeHotel),
    places: parseCsv(placeText).map(normalizePlace),
  };
  return catalogCache;
}

function resolveAnchor(query) {
  const known = destinationPlaces.find((place) => place.name.toLowerCase() === lower(query))
    || destinationPlaces.find((place) => lower(query).includes(place.name.toLowerCase()))
    || destinationPlaces.find((place) => lower(place.state).includes(lower(query)))
    || destinationPlaces[0];
  const coords = findCoords(known?.name || query || destinationPlaces[0].name);
  return {
    name: known?.name || String(query || destinationPlaces[0].name),
    state: known?.state || "India",
    region: known?.region || "India",
    lat: coords[0],
    lng: coords[1],
    highlights: known?.highlights || [],
    tags: known?.tags || [],
    blurb: known?.blurb || "A useful travel anchor.",
  };
}

function hotelBudgetBias(stayPreference, budgetValue) {
  const stay = lower(stayPreference);
  const budget = lower(budgetValue);
  if (stay.includes("luxury") || budget.includes("luxury")) return "luxury";
  if (stay.includes("hostel") || budget.includes("budget")) return "budget";
  if (stay.includes("resort") || budget.includes("mid")) return "mid-range";
  return "mid-range";
}

function placeCategoryPriority(place) {
  const key = place.categoryKey;
  if (key.includes("tourist_attraction")) return 5;
  if (key.includes("museum")) return 5;
  if (key.includes("park")) return 4;
  if (key.includes("temple")) return 5;
  if (key.includes("beach")) return 5;
  if (key.includes("restaurant")) return 3;
  if (key.includes("cafe")) return 2;
  if (key.includes("shopping")) return 3;
  if (key.includes("hotel")) return 1;
  return 2;
}

function nearbyFallback(anchor, count, label) {
  return Array.from({ length: count }, (_, index) => {
    const city = anchor.name;
    const names = label === "hotel"
      ? [`${city} Central Hotel`, `${city} Heritage Hotel`, `${city} Comfort Suites`, `${city} Budget Nest`]
      : anchor.highlights.length
        ? anchor.highlights
        : [`${city} Main Market`, `${city} Heritage Walk`, `${city} Sunset Point`, `${city} Local Food Street`];
    const name = names[index % names.length];
    const budget = label === "hotel"
      ? ["budget", "mid-range", "mid-range", "luxury"][index % 4]
      : ["budget", "budget", "mid-range", "luxury"][index % 4];
    const rating = label === "hotel" ? [7.4, 8.1, 8.4, 8.8][index % 4] : [4.1, 4.3, 4.5, 4.7][index % 4];
    return {
      id: `${label}-fallback-${index}`,
      name,
      rawName: name,
      address: `${city}, ${anchor.state}`,
      category: label === "hotel" ? "Hotel / Accommodation" : "Local attraction",
      tags: label === "hotel" ? ["stay", "comfort", budget] : ["sightseeing", "local", "easy-stop"],
      rating,
      reviews: label === "hotel" ? 42 + index * 11 : 18 + index * 7,
      budget,
      why: label === "hotel"
        ? `A practical fallback stay for ${city} when the live hotel corpus is thin.`
        : `A flexible nearby stop that fits a simple ${city} route.`,
      entryFee: label === "hotel" ? "N/A" : formatCurrency(0),
      bestFor: "all",
      bestSeason: "All season",
      distanceKm: 0,
      source: "synthetic",
    };
  });
}

function extractJsonObject(text) {
  const cleaned = String(text || "")
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function enrichWithOllama(anchor, hotels, places, preferences) {
  const prompt = `
You are a tourist expert for India.
Return JSON only. Do not add markdown, bullets, or commentary.
Use only the hotel and place IDs/names provided below.

Destination: ${anchor.name}
State: ${anchor.state}
Stay preference: ${preferences.stayPreference || "flexible"}
Budget band: ${preferences.budget || "auto"}
Interests: ${(preferences.interests || []).join(", ") || "general travel"}

Hotel candidates:
${JSON.stringify(hotels.slice(0, 6).map((hotel) => ({
    id: hotel.id,
    name: hotel.name,
    stayType: hotel.stayType,
    budget: hotel.budget,
    rating: hotel.rating,
    distanceKm: hotel.distanceKm,
    address: hotel.address,
    tags: hotel.tags,
  })), null, 2)}

Place candidates:
${JSON.stringify(places.slice(0, 6).map((place) => ({
    id: place.id,
    name: place.name,
    category: place.category,
    budget: place.budget,
    rating: place.rating,
    distanceKm: place.distanceKm,
    tags: place.tags,
  })), null, 2)}

Return this exact shape:
{
  "hotels": [
    { "id": "hotel-id", "why": "one short destination-specific sentence", "fit": "family|couple|friends|solo|luxury|budget" }
  ],
  "places": [
    { "id": "place-id", "why": "one short destination-specific sentence" }
  ]
}

Rules:
- Keep the exact ids unchanged.
- Never invent hotel or place names.
- Prefer the strongest real stay options.
- Make the reasons practical and specific to the destination.`;
  try {
    const response = await queryBackend(prompt, { useTripContext: false });
    return extractJsonObject(response);
  } catch {
    return null;
  }
}

function scoreHotel(item, anchor, preferences) {
  const d = item.lat && item.lng ? distanceKm(anchor.lat, anchor.lng, item.lat, item.lng) : 45;
  const budgetBias = hotelBudgetBias(preferences.stayPreference, preferences.budget);
  let score = 100 - Math.min(80, d);
  if (item.budget === budgetBias) score += 10;
  if (lower(preferences.stayPreference).includes("family") && ["hotel", "guest house", "resort", "inn"].some((type) => lower(item.stayType).includes(type))) score += 10;
  if (lower(preferences.stayPreference).includes("hostel") && lower(item.stayType).includes("hostel")) score += 10;
  if (lower(preferences.stayPreference).includes("resort") && lower(item.stayType).includes("resort")) score += 10;
  if (!lower(preferences.stayPreference).includes("hostel") && lower(item.stayType).includes("hostel")) score -= 20;
  if ((preferences.interests || []).some((interest) => item.tags.some((tag) => lower(tag).includes(lower(interest))))) score += 8;
  return { ...item, distanceKm: Number(d.toFixed(1)), score };
}

function scorePlace(item, anchor, preferences) {
  const d = item.lat && item.lng ? distanceKm(anchor.lat, anchor.lng, item.lat, item.lng) : 45;
  let score = 100 - Math.min(85, d);
  score += placeCategoryPriority(item) * 4;
  if ((preferences.interests || []).some((interest) => item.tags.some((tag) => lower(tag).includes(lower(interest))))) score += 10;
  if (preferences.nearbyFocus && item.tags.some((tag) => lower(tag).includes(lower(preferences.nearbyFocus)))) score += 8;
  if (preferences.visitFocus && item.description.toLowerCase().includes(lower(preferences.visitFocus))) score += 6;
  return { ...item, distanceKm: Number(d.toFixed(1)), score };
}

export async function getTravelRecommendations({ destination, stayPreference = "", budget = "", interests = [], nearbyFocus = "", visitFocus = "" } = {}) {
  const catalog = await loadCatalog();
  const anchor = resolveAnchor(destination);
  const preferredBudget = hotelBudgetBias(stayPreference, budget);
  const stayCatalog = catalog.hotels.filter((item) => item.isLikelyStay);
  const preferHostel = lower(stayPreference).includes("hostel");
  const hotelSource = (preferHostel ? stayCatalog : stayCatalog.filter((item) => !lower(item.stayType).includes("hostel")))
    .length
    ? (preferHostel ? stayCatalog : stayCatalog.filter((item) => !lower(item.stayType).includes("hostel")))
    : (stayCatalog.length ? stayCatalog : catalog.hotels);

  const hotelMatches = hotelSource
    .map((item) => scoreHotel(item, anchor, { stayPreference, budget, interests }))
    .filter((item) => item.distanceKm <= 75 || lower(item.address).includes(lower(anchor.state)) || lower(item.name).includes(lower(anchor.name)))
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm)
    .slice(0, 6);

  const placeMatches = catalog.places
    .map((item) => scorePlace(item, anchor, { interests, nearbyFocus, visitFocus }))
    .filter((item) => item.categoryKey.includes("tourist_attraction") || item.categoryKey.includes("museum") || item.categoryKey.includes("park") || item.categoryKey.includes("temple") || item.categoryKey.includes("beach") || item.categoryKey.includes("shopping") || item.categoryKey.includes("restaurant") || item.categoryKey.includes("cafe"))
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm)
    .slice(0, 8);

  const hotels = hotelMatches.length ? hotelMatches : nearbyFallback(anchor, 4, "hotel");
  const places = placeMatches.length ? placeMatches : nearbyFallback(anchor, 6, "place");

  const ollamaBrief = await enrichWithOllama(anchor, hotels, places, { stayPreference, budget, interests }).catch(() => null);
  const hotelNotes = new Map((ollamaBrief?.hotels || []).map((item) => [item.id, item]));
  const placeNotes = new Map((ollamaBrief?.places || []).map((item) => [item.id, item]));

  const hotelsWithNotes = hotels.map((hotel) => {
    const note = hotelNotes.get(hotel.id);
    return note
      ? {
          ...hotel,
          why: note.why || hotel.why,
          fit: note.fit || hotel.fit || "",
        }
      : hotel;
  });

  const placesWithNotes = places.map((place) => {
    const note = placeNotes.get(place.id);
    return note
      ? {
          ...place,
          why: note.why || place.why,
        }
      : place;
  });

  return {
    anchor,
    preferredBudget,
    hotels: hotelsWithNotes,
    places: placesWithNotes,
    summary: {
      hotelCount: hotelsWithNotes.length,
      placeCount: placesWithNotes.length,
      hotelBudget: hotelsWithNotes[0]?.budget || preferredBudget,
      placeBudget: placesWithNotes[0]?.budget || "budget",
    },
  };
}
