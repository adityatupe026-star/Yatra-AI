import { CITY_COORDS } from "../core/config.js";
import { destinationPlaces } from "../data/site-data.js";
import { getRestaurantSuggestions } from "./restaurants.js";
import { findCoords } from "./helpers.js";

export const buildGoogleMapsDirectionsLink = (plan) => {
  const origin = encodeURIComponent(plan.start || "India");
  const destination = encodeURIComponent(`${plan.place.name}, ${plan.place.state}`);
  const travelMode = plan.mode === "Road" ? "driving" : plan.mode === "Train" ? "transit" : "driving";
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${travelMode}`;
};

export const buildGoogleMapsPlaceLink = (place) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.state}`)}`;

export function transportIcon(mode) {
  if (mode === "Air") return "Flight";
  if (mode === "Train") return "Train";
  return "Road";
}

export function estimateCost(mode) {
  if (mode === "Air") return "Rs.4000 - Rs.8000";
  if (mode === "Train") return "Rs.500 - Rs.1500";
  return "Rs.1500 - Rs.3000";
}

export function estimateTime(mode) {
  if (mode === "Air") return "2-4 hrs";
  if (mode === "Train") return "8-16 hrs";
  return "10-20 hrs";
}

export function getModeRecommendation(plan) {
  const budget = Number(plan.budget || 0);
  const days = Number(plan.days || 0);
  if (budget && budget < 2000 && plan.mode !== "Train") return "Budget-sensitive travelers should also compare train options for better value.";
  if (days && days <= 3 && plan.mode === "Road") return "Short trips may feel tighter by road, so compare air or train if time matters most.";
  if (plan.mode === "Air") return "Best when time matters more than cost and you want a faster arrival window.";
  if (plan.mode === "Train") return "Best when you want lower cost, comfortable intercity travel, and practical city-to-city connections.";
  return "Best when flexibility, sightseeing stops, and self-paced travel matter most.";
}

export function buildWorkflow(mode, start, place) {
  if (mode === "Air") {
    return [
      `Reach the departure airport from ${start}.`,
      `Fly into ${place.airport}.`,
      `Transfer into ${place.name} and settle near your first key stop.`,
      `Use local road travel for ${place.highlights.join(", ")}.`,
    ];
  }
  if (mode === "Train") {
    return [
      `Travel from ${start} to ${place.rail}.`,
      `Arrive at the station and transfer into ${place.name}.`,
      `Use local transport for the city circuit and highlights.`,
      `Keep a flexible final leg for return or onward travel.`,
    ];
  }
  return [
    `Leave ${start} by road using ${place.road}.`,
    `Take a scenic or fast corridor into ${place.name}.`,
    `Move between highlights at your own pace.`,
    `Keep the return route open for food stops or detours.`,
  ];
}

export function buildTransportPlan(plan) {
  if (plan.mode === "Air") {
    return {
      summary: `Flight-based routing works best as a staged journey into ${plan.place.name}.`,
      steps: [`${plan.start} to nearest departure airport`, `Flight segment into ${plan.place.airport}`, `${plan.place.airport} to ${plan.place.name} city area`],
      bookingNote: `Use airline booking portals and compare airport transfers near ${plan.place.airport}.`,
      routeMode: "flight",
    };
  }
  if (plan.mode === "Train") {
    return {
      summary: `Train travel into ${plan.place.rail} is the most practical rail-led route for this trip.`,
      steps: [`${plan.start} to departure station`, `Main rail segment into ${plan.place.rail}`, `${plan.place.rail} to ${plan.place.name} local stay area`],
      bookingNote: `IRCTC or rail-booking partners are recommended for schedules and seat availability.`,
      routeMode: "transit",
    };
  }
  return {
    summary: "Road routing can be mapped directly with turn-by-turn guidance.",
    steps: [`Leave ${plan.start} using ${plan.place.road}`, `Continue toward ${plan.place.name}`, `Use local roads for ${plan.place.highlights.join(", ")}`],
    bookingNote: "Ideal for self-drive, taxi, or flexible stop-based travel.",
    routeMode: "driving",
  };
}

export function getStaySuggestion(plan) {
  const pref = (plan.stayPreference || "").toLowerCase();
  if (pref.includes("hostel")) return `Focus on hostel and low-cost stay options near ${plan.place.name}'s main transit area.`;
  if (pref.includes("resort")) return `Look for resort-style stays around scenic or quieter parts of ${plan.place.name}.`;
  if (pref.includes("family")) return `Choose family-friendly stays near safe, central and easy-access areas in ${plan.place.name}.`;
  return `Choose a ${plan.stayPreference || "comfortable"} stay near the main highlights of ${plan.place.name}.`;
}

export function getDiningPlan(plan) {
  const picks = getRestaurantSuggestions(plan.place.name).slice(0, 4);
  const chosen = plan.restaurantName || picks[0];
  return {
    summary: `Dining is part of this trip flow, so keep one premium meal and one casual local stop near ${plan.place.name}'s main exploration zone.`,
    chosen,
    picks,
    note: `Best use: anchor one lunch or dinner around ${chosen}, then cluster nearby sightseeing around that meal window.`,
  };
}

export function haversineKm(aLat, aLng, bLat, bLng) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

export function estimateTransportRangeByDistance(mode, startCoords, place) {
  const distanceKm = haversineKm(startCoords[0], startCoords[1], place.lat, place.lng);
  if (mode === "Air") {
    const low = Math.round(Math.max(2800, distanceKm * 6));
    const high = Math.round(Math.max(5200, distanceKm * 10));
    return { low, high, distanceKm: Math.round(distanceKm) };
  }
  if (mode === "Train") {
    const low = Math.round(Math.max(450, distanceKm * 1.1));
    const high = Math.round(Math.max(1400, distanceKm * 2.2));
    return { low, high, distanceKm: Math.round(distanceKm) };
  }
  const low = Math.round(Math.max(1200, distanceKm * 3.2));
  const high = Math.round(Math.max(2600, distanceKm * 5.8));
  return { low, high, distanceKm: Math.round(distanceKm) };
}

export function buildBudgetBreakdown(plan, startCoords) {
  const transport = estimateTransportRangeByDistance(plan.mode, startCoords, plan.place);
  const days = Number(plan.days || 1);
  const stayBase = (plan.stayPreference || "").toLowerCase().includes("luxury")
    ? [4500, 9000]
    : (plan.stayPreference || "").toLowerCase().includes("hostel")
    ? [700, 1800]
    : (plan.stayPreference || "").toLowerCase().includes("resort")
    ? [3500, 7000]
    : [1800, 4200];
  const foodBase = isFinite(days) ? [days * 700, days * 1800] : [1200, 3200];
  const activityBase = [Math.max(1000, days * 600), Math.max(2400, days * 1500)];
  return {
    distanceKm: transport.distanceKm,
    transport,
    stay: { low: stayBase[0] * days, high: stayBase[1] * days },
    food: { low: foodBase[0], high: foodBase[1] },
    activities: { low: activityBase[0], high: activityBase[1] },
    total: {
      low: transport.low + stayBase[0] * days + foodBase[0] + activityBase[0],
      high: transport.high + stayBase[1] * days + foodBase[1] + activityBase[1],
    },
  };
}

export function buildPackingList(plan) {
  const pref = `${plan.place.region} ${(plan.vibe || "").toLowerCase()} ${(plan.interests || []).join(" ")}`.toLowerCase();
  const items = ["Government ID", "Phone charger", "Comfortable walking shoes", "Power bank"];
  if (pref.includes("beach") || pref.includes("goa") || pref.includes("andaman")) items.push("Sunglasses", "Light cotton wear", "Sunscreen", "Flip-flops");
  if (pref.includes("himalaya") || pref.includes("leh") || pref.includes("ooty") || pref.includes("munnar")) items.push("Light jacket", "Warm layer", "Moisturizer", "Closed shoes");
  if (pref.includes("adventure") || pref.includes("road")) items.push("Small first-aid kit", "Reusable water bottle", "Offline maps screenshot");
  if (pref.includes("spiritual") || pref.includes("temple")) items.push("Modest clothing", "Slip-on footwear");
  return [...new Set(items)];
}

export function encodeSharePlan(plan) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(plan))));
}

export function decodeSharePlan(serialized) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(serialized))));
  } catch {
    return null;
  }
}

export async function geocodePlace(query) {
  const known = destinationPlaces.find((p) => p.name.toLowerCase() === String(query).toLowerCase());
  if (known) return [known.lat, known.lng, known.name];
  if (CITY_COORDS[query]) return [CITY_COORDS[query][0], CITY_COORDS[query][1], query];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Geocoding failed");
  const data = await response.json();
  const item = data?.[0];
  if (!item) return findCoords(query);
  return [Number(item.lat), Number(item.lon), item.display_name];
}

export async function fetchRouteGeometry(plan) {
  const start = await geocodePlace(plan.start);
  const end = [plan.place.lat, plan.place.lng, plan.place.name];
  const profile = plan.mode === "Road" ? "driving" : plan.mode === "Train" ? "transit" : plan.mode === "Air" ? "flying" : "driving";
  const transportPlan = buildTransportPlan(plan);
  if (plan.mode !== "Road") {
    return { start, end, route: [[start[1], start[0]], [end[1], end[0]]], distanceKm: null, durationMin: null, steps: [], isSimulated: true, transportPlan };
  }
  const coords = `${start[1]},${start[0]};${end[1]},${end[0]}`;
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Routing failed");
  const data = await response.json();
  const route = data.routes?.[0];
  return {
    start,
    end,
    route: route ? route.geometry.coordinates : [[start[1], start[0]], [end[1], end[0]]],
    distanceKm: route ? (route.distance / 1000).toFixed(1) : null,
    durationMin: route ? Math.round(route.duration / 60) : null,
    steps: route ? route.legs.flatMap((leg) => leg.steps || []) : [],
    isSimulated: false,
    transportPlan,
  };
}

export async function drawRouteMap(elementId, plan, stateHolder = {}) {
  if (typeof L === "undefined") return null;
  const routeData = await fetchRouteGeometry(plan);
  if (!stateHolder.map) {
    stateHolder.map = L.map(elementId, { zoomControl: true }).setView([routeData.start[0], routeData.start[1]], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(stateHolder.map);
  }
  if (stateHolder.layer) stateHolder.layer.remove();
  stateHolder.layer = L.layerGroup().addTo(stateHolder.map);
  L.marker([routeData.start[0], routeData.start[1]]).addTo(stateHolder.layer).bindPopup(`Start: ${routeData.start[2]}`);
  L.marker([routeData.end[0], routeData.end[1]]).addTo(stateHolder.layer).bindPopup(`Destination: ${routeData.end[2]}`);
  const latLngs = routeData.route.map((coord) => [coord[1], coord[0]]);
  L.polyline(latLngs, { color: "#f3c76b", weight: 5, opacity: 0.9 }).addTo(stateHolder.layer);
  stateHolder.map.fitBounds(latLngs, { padding: [40, 40] });
  plan.routeMeta = routeData;
  return routeData;
}
