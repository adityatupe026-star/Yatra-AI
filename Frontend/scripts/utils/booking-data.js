import { destinationPlaces } from "../data/site-data.js";
import { findCoords, formatCurrency } from "./helpers.js";

const DATA_URLS = {
  destinations: new URL("../../../data/hackathon/destinations.json", import.meta.url),
  itineraries: new URL("../../../data/hackathon/itineraries.json", import.meta.url),
  costs: new URL("../../../data/hackathon/cost_benchmarks.json", import.meta.url),
};

const AIRLINES = [
  "Air India",
  "Vistara",
  "IndiGo",
  "Akasa Air",
  "SpiceJet",
  "Air India Express",
];

const BUS_OPERATORS = [
  { name: "Volvo Express", punctuality: 4.7, cleanliness: 4.6, staff: 4.4, driving: 4.5 },
  { name: "Intercity Star", punctuality: 4.5, cleanliness: 4.4, staff: 4.3, driving: 4.4 },
  { name: "Night Owl", punctuality: 4.2, cleanliness: 4.3, staff: 4.1, driving: 4.2 },
  { name: "Pink Line", punctuality: 4.6, cleanliness: 4.7, staff: 4.5, driving: 4.3 },
  { name: "State Connect", punctuality: 4.0, cleanliness: 4.1, staff: 4.0, driving: 4.1 },
];

const TRAIN_NAMERS = [
  "Intercity Express",
  "Duronto Special",
  "Jan Shatabdi",
  "Rajdhani Link",
  "Humsafar Express",
  "AC Superfast",
];

const TRAIN_QUOTAS = [
  ["General", "Bulk inventory for all travellers"],
  ["Ladies", "Reserved quota for women travellers"],
  ["Senior Citizen", "Age-based concession pools"],
  ["Defence", "Eligibility-based defence quota"],
  ["Foreign Tourist", "Quota for overseas travellers"],
];

const PROPERTY_TYPES = ["Hotel", "Resort", "Villa", "Hostel", "Homestay", "Service Apartment", "Heritage Haveli"];

const AMENITY_POOL = [
  "pool",
  "gym",
  "spa",
  "wifi",
  "parking",
  "breakfast included",
  "pet-friendly",
  "airport pickup",
  "family rooms",
  "restaurant",
];

const EXPERIENCE_CATALOG = [
  { name: "Adventure sports", tag: "Adventure", duration: 3, mode: "Instant confirmed" },
  { name: "Cultural tours", tag: "Culture", duration: 4, mode: "Instant confirmed" },
  { name: "Food trails", tag: "Food", duration: 3, mode: "On-arrival voucher" },
  { name: "Wellness retreats", tag: "Wellness", duration: 5, mode: "Instant confirmed" },
  { name: "Wildlife", tag: "Wildlife", duration: 6, mode: "Instant confirmed" },
  { name: "City sightseeing", tag: "Sightseeing", duration: 4, mode: "On-arrival voucher" },
];

let cache = null;

const hashText = (value) => {
  let hash = 0;
  for (let i = 0; i < String(value || "").length; i += 1) {
    hash = ((hash << 5) - hash) + String(value)[i].charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const pick = (list, seed, count) => {
  const copy = [...list];
  const out = [];
  let cursor = seed % Math.max(copy.length, 1);
  while (copy.length && out.length < count) {
    cursor = (cursor + seed + out.length * 7) % copy.length;
    out.push(copy.splice(cursor, 1)[0]);
  }
  return out;
};

const toDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date;
};

const formatDate = (date) => date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const toClock = (minutes) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${suffix}`;
};

const haversineKm = (aLat, aLng, bLat, bLng) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
};

const resolvePlaceRecord = (name) => destinationPlaces.find((place) => place.name.toLowerCase() === String(name || "").toLowerCase())
  || destinationPlaces.find((place) => String(name || "").toLowerCase().includes(place.name.toLowerCase()))
  || destinationPlaces[0];

const resolveCoords = (name) => {
  const [lat, lng, resolvedName] = findCoords(name);
  return { lat, lng, name: resolvedName || name };
};

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load ${url}`);
  return response.json();
}

export async function loadMvpData() {
  if (cache) return cache;
  const [destinations, itineraries, costs] = await Promise.all([
    readJson(DATA_URLS.destinations),
    readJson(DATA_URLS.itineraries),
    readJson(DATA_URLS.costs),
  ]);
  cache = { destinations, itineraries, costs };
  return cache;
}

function routeDistance(origin, destination) {
  const start = resolveCoords(origin);
  const end = resolveCoords(destination);
  return Math.max(80, haversineKm(start.lat, start.lng, end.lat, end.lng));
}

function priceBandForDistance(distanceKm, budgetBand = "") {
  const band = String(budgetBand || "").toLowerCase();
  if (distanceKm < 450) return band.includes("luxury") ? 8500 : band.includes("budget") ? 3200 : 5200;
  if (distanceKm < 1200) return band.includes("luxury") ? 14500 : band.includes("budget") ? 4200 : 8200;
  return band.includes("luxury") ? 22800 : band.includes("budget") ? 6800 : 12800;
}

function flightDuration(distanceKm, stops = 0) {
  return Math.round((distanceKm / 8.8) + (stops * 70) + 55);
}

export function buildFlightOptions({
  origin,
  destination,
  classType = "Economy",
  passengers = 1,
  tripType = "One way",
  budget = "",
  maxStops = "Any",
  departureSlot = "Any",
}) {
  const distanceKm = routeDistance(origin, destination);
  const basePrice = priceBandForDistance(distanceKm, budget);
  const classMultiplier = {
    Economy: 1,
    Premium: 1.18,
    Business: 1.8,
    First: 2.7,
  }[classType] || 1;
  const stops = ["Non-stop", "1 stop", "2+ stops"];
  const filteredStops = maxStops === "Any"
    ? stops
    : maxStops === "Non-stop"
      ? ["Non-stop"]
      : maxStops === "1 stop"
        ? ["1 stop"]
        : ["2+ stops"];
  const slotOffsets = {
    "Early morning": 5 * 60,
    Daytime: 11 * 60,
    Evening: 18 * 60,
    Night: 22 * 60,
  };
  const preferredSlot = departureSlot === "Any" ? null : slotOffsets[departureSlot] || null;
  return AIRLINES.map((airline, index) => {
    const stopLabel = filteredStops[index % filteredStops.length];
    const stopCount = stopLabel === "Non-stop" ? 0 : stopLabel === "1 stop" ? 1 : 2;
    const departMin = preferredSlot != null ? preferredSlot + index * 22 : (5 * 60) + (index * 127);
    const duration = flightDuration(distanceKm, stopCount);
    const arrivalMin = departMin + duration;
    const flightNo = `${airline.split(" ").map((part) => part[0]).join("").toUpperCase()}${100 + ((hashText(origin + destination + airline) + index) % 900)}`;
    const surcharge = tripType.toLowerCase().includes("return") ? 0.88 : 1;
    const price = Math.round(basePrice * classMultiplier * surcharge + (index * 640) + stopCount * 420);
    const layoverAirport = stopCount ? ["Delhi", "Bengaluru", "Hyderabad", "Mumbai"][index % 4] : "None";
    return {
      id: `${origin}-${destination}-${airline}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      airline,
      flightNo,
      classType,
      stops: stopLabel,
      layoverAirport,
      depart: toClock(departMin),
      arrive: toClock(arrivalMin),
      duration,
      durationLabel: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      price: price * clamp(Number(passengers) || 1, 1, 6),
      basePrice: price,
      gate: `T${(index % 3) + 1}-${(index % 28) + 2}`,
      cabin: classType === "Business" ? "Priority cabin" : classType === "First" ? "Suite cabin" : "Standard cabin",
      why: stopCount === 0 ? "Best for faster arrival and a simpler connection." : "Good balance of price and schedule flexibility.",
      baggage: classType === "First" ? "2 x checked bags" : classType === "Business" ? "1 x checked bag + cabin bag" : "Cabin bag + 1 checked bag",
      meal: ["Veg", "Non-veg", "Jain", "Child meal", "Diabetic"][index % 5],
      lockEligible: index % 2 === 0,
      distanceKm: Math.round(distanceKm),
    };
  }).slice(0, 6);
}

export function buildFareCalendar(flights, days = 30) {
  const cheapest = Math.min(...flights.map((flight) => flight.price));
  return Array.from({ length: days }, (_, index) => {
    const date = toDate(index);
    const weekendBoost = [0, 6].includes(date.getDay()) ? 1.12 : 1;
    const seasonal = 0.92 + ((hashText(date.toDateString()) % 11) / 100);
    const price = Math.round(cheapest * weekendBoost * seasonal);
    return {
      date,
      label: formatDate(date),
      price,
      isCheapest: price === cheapest,
      dayName: date.toLocaleDateString("en-IN", { weekday: "short" }),
    };
  });
}

export function buildBusOptions({ source, destination }) {
  const distanceKm = routeDistance(source, destination);
  const routeSeed = hashText(`${source}-${destination}`);
  return BUS_OPERATORS.map((operator, index) => {
    const depart = 20 * 60 + index * 55;
    const duration = Math.round(distanceKm * 1.85 + (index * 24));
    const arrival = depart + duration;
    const sleeper = index % 2 === 0;
    const price = Math.round((distanceKm * 2.4) + (index * 180) + (sleeper ? 240 : 0));
    return {
      id: `bus-${routeSeed}-${index}`,
      operator: operator.name,
      operatorRating: Number((4.2 + (index * 0.12)).toFixed(1)),
      punctuality: operator.punctuality,
      cleanliness: operator.cleanliness,
      staff: operator.staff,
      driving: operator.driving,
      busType: sleeper ? "Sleeper AC" : "Seater AC",
      departure: toClock(depart),
      arrival: toClock(arrival),
      duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      price,
      seatsLeft: Math.max(3, 32 - (index * 4)),
      boardingPoints: [
        `${source} Central Bus Stand`,
        `${source} Main Market Pickup`,
        `${source} Metro Station Stop`,
      ],
      droppingPoints: [
        `${destination} City Depot`,
        `${destination} Station Circle`,
        `${destination} Market Stop`,
      ],
      tracking: `Live ETA updates every 10 minutes for ${source} to ${destination}.`,
      why: sleeper ? "Best for overnight comfort and lower ticket stress." : "Good for a quicker day route with easy boarding.",
    };
  });
}

export function buildTrainOptions({ source, destination, classType = "3AC" }) {
  const distanceKm = routeDistance(source, destination);
  const routeSeed = hashText(`${source}-${destination}-${classType}`);
  return TRAIN_NAMERS.map((name, index) => {
    const depart = 5 * 60 + index * 90;
    const duration = Math.round((distanceKm * 1.4) + (index * 26));
    const arrival = depart + duration;
    const classMultiplier = { SL: 0.8, "3AC": 1, "2AC": 1.42, "1AC": 2.2, CC: 0.88, EC: 1.3 }[classType] || 1;
    const base = distanceKm * 1.05;
    const price = Math.round(base * classMultiplier + (index * 120));
    const availabilitySeed = (routeSeed + index * 13) % 100;
    const status = availabilitySeed > 72 ? "WL" : availabilitySeed > 42 ? "RAC" : "AVAILABLE";
    return {
      id: `train-${routeSeed}-${index}`,
      trainNo: `${1 + (routeSeed % 9)}${4000 + index * 73}`,
      name: `${name} ${index + 1}`,
      classType,
      departure: toClock(depart),
      arrival: toClock(arrival),
      duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      price,
      status,
      quota: TRAIN_QUOTAS[index % TRAIN_QUOTAS.length][0],
      coachNote: `Best for ${classType} travellers on the ${source} to ${destination} corridor.`,
      distanceKm: Math.round(distanceKm),
      availabilitySeed,
      autoUpgrade: index % 2 === 0,
      routeSummary: `Rail flow into ${destination} with ${status} status on this generated corridor.`,
    };
  });
}

export function buildTrainAvailabilityCalendar({ classType = "3AC", routeKey = "route" } = {}) {
  return Array.from({ length: 120 }, (_, index) => {
    const date = toDate(index);
    const seed = hashText(`${classType}-${routeKey}-${index}`);
    const band = seed % 100;
    const status = band > 80 ? "WL" : band > 58 ? "RAC" : "AVAILABLE";
    return {
      date,
      label: formatDate(date),
      status,
      seats: status === "AVAILABLE" ? 42 - (seed % 12) : status === "RAC" ? 8 + (seed % 6) : 0,
    };
  });
}

export function evaluatePnr(pnr) {
  const seed = hashText(String(pnr || ""));
  const status = seed % 3 === 0 ? "CONFIRMED" : seed % 3 === 1 ? "RAC" : "WL";
  return {
    status,
    waitlistPosition: status === "WL" ? 1 + (seed % 18) : 0,
    confirmationProbability: status === "CONFIRMED" ? 98 : status === "RAC" ? 63 : 34,
    coach: ["S1", "B2", "A1", "S3"][seed % 4],
    charting: status === "WL" ? "Pending chart" : "Chart prepared",
  };
}

export function buildCarOptions({ source, destination }) {
  const distanceKm = routeDistance(source, destination);
  const routeSeed = hashText(`${source}-${destination}`);
  const types = [
    { name: "Hatchback", rate: 18, note: "Best for small groups and airport runs." },
    { name: "Sedan", rate: 22, note: "Good comfort for city-to-city rides." },
    { name: "SUV", rate: 28, note: "Roomier for families and luggage-heavy trips." },
    { name: "Premium SUV", rate: 36, note: "Best for premium transfer comfort." },
  ];
  return types.map((item, index) => {
    const base = Math.round(distanceKm * item.rate);
    const citySightseeing = index === 0 ? "Half-day sightseeing" : index === 1 ? "Airport transfer" : index === 2 ? "Outstation" : "Self-drive";
    return {
      id: `cab-${routeSeed}-${index}`,
      carType: item.name,
      useCase: citySightseeing,
      price: base + (index * 340),
      perKm: item.rate,
      includedKm: index === 0 ? 40 : index === 1 ? 30 : index === 2 ? 250 : 180,
      driverAssigned: index !== 3,
      fixedFare: index !== 3,
      fuelIncluded: index !== 3,
      handover: index === 3 ? "Pick up from hub, return yourself" : "Driver details shared before pickup",
      note: item.note,
      distanceKm: Math.round(distanceKm),
      routeSeed,
    };
  });
}

export async function buildPackageOptions(destinationName) {
  const data = await loadMvpData();
  const destination = data.destinations.find((item) => item.name.toLowerCase() === String(destinationName || "").toLowerCase())
    || data.destinations[0];
  const relatedItineraries = data.itineraries.filter((item) => item.destination.toLowerCase() === destination.name.toLowerCase()).slice(0, 3);
  const dailyCost = destination.average_daily_cost || data.costs?.food?.mid_range?.low || 2500;
  const dayPlans = relatedItineraries.length
    ? relatedItineraries
    : [{
        name: `${destination.name} Classic`,
        days: 4,
        transport: "Road",
        best_for: destination.tags || [],
        season_note: destination.best_season,
        savings_tip: "Keep one central stay and one shared transfer to simplify the budget.",
        budget: destination.budget_range || { low: dailyCost * 3, high: dailyCost * 4, label: "Mid-range" },
        highlight_chain: destination.highlights || [],
        day_plan: [
          { day: 1, morning: `Arrive in ${destination.name} and check in.`, afternoon: `Visit ${destination.highlights?.[0] || "the main highlight"}.`, evening: "Finish with local food." },
          { day: 2, morning: `Plan a central landmark around ${destination.highlights?.[1] || "the city core"}.`, afternoon: "Use midday for a slower lunch break.", evening: "Keep one premium dinner option." },
        ],
      }];
  const tiers = [
    ["Standard", 1, "3-star hotels, shared transfers"],
    ["Deluxe", 1.35, "4-star hotels, private transfers"],
    ["Luxury", 1.8, "5-star hotels, premium experiences"],
  ];
  return dayPlans.flatMap((plan, index) => tiers.map(([tier, multiplier, note]) => ({
    id: `pkg-${destination.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}-${tier.toLowerCase()}`,
    name: `${plan.days} Nights ${destination.name} ${tier}`,
    destination: destination.name,
    state: destination.state,
    days: plan.days,
    tier,
    note,
    transport: plan.transport,
    bestFor: plan.best_for,
    budgetLow: Math.round((plan.budget?.low || dailyCost * plan.days) * multiplier),
    budgetHigh: Math.round((plan.budget?.high || dailyCost * plan.days * 1.5) * multiplier),
    savingsTip: plan.savings_tip,
    highlightChain: plan.highlight_chain,
    dayPlan: plan.day_plan,
    includes: ["Stay", "Airport/rail transfers", "Sightseeing", "Breakfast"],
    excludes: ["Flights", "Visa fees", "Personal shopping"],
    emi: Math.round(((plan.budget?.high || dailyCost * plan.days) * multiplier) / 12),
  })));
}

export function buildExperienceOptions(destinationName) {
  const destination = resolvePlaceRecord(destinationName);
  const seed = hashText(destination.name);
  return EXPERIENCE_CATALOG.map((experience, index) => {
    const meetingPoint = `${destination.name} ${["Main Gate", "Central Market", "Harbour Point", "Station Exit"][index % 4]}`;
    const slotBase = ["08:00", "10:30", "14:00", "17:30"][index % 4];
    const basePrice = 1200 + (index * 280) + (seed % 300);
    return {
      id: `exp-${seed}-${index}`,
      category: experience.name,
      tag: experience.tag,
      pricePerPerson: basePrice,
      durationHours: experience.duration,
      slots: [slotBase, "12:00", "16:00", "19:00"].slice(0, 3),
      meetingPoint,
      includes: [
        "Guide",
        "Basic equipment",
        "Entry support",
      ],
      excludes: [
        "Transport",
        "Personal expenses",
      ],
      minGroupSize: index % 2 === 0 ? 4 : 1,
      confirmationType: experience.mode,
      why: `Good for travellers who want a ${experience.tag.toLowerCase()}-led stop in ${destination.name}.`,
      destination: destination.name,
    };
  });
}

export function buildPriceRangeSummary(value, label) {
  return `${formatCurrency(Math.round(value * 0.85))} to ${formatCurrency(Math.round(value * 1.15))} (${label})`;
}
