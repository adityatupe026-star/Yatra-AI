import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const FRONTEND_DATA = path.join(ROOT, "Frontend", "scripts", "data", "site-data.js");
const FRONTEND_CONFIG = path.join(ROOT, "Frontend", "scripts", "core", "config.js");
const OUT_DIR = path.join(ROOT, "data", "hackathon");

function extractJsConstant(source, name) {
  const marker = `export const ${name} =`;
  const startMarker = source.indexOf(marker);
  if (startMarker === -1) throw new Error(`Missing constant: ${name}`);
  let start = startMarker + marker.length;
  while (!"[{".includes(source[start])) start += 1;
  const opener = source[start];
  const closer = opener === "[" ? "]" : "}";
  let depth = 0;
  let quote = "";
  let escape = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === quote) {
        quote = "";
      }
      continue;
    }
    if (ch === "\"" || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === opener) depth += 1;
    if (ch === closer) {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

function jsToJson(jsText) {
  const cleaned = jsText
    .replace(/(?<=\{|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '"$1":')
    .replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(cleaned);
}

function loadFrontendData() {
  const dataSource = fs.readFileSync(FRONTEND_DATA, "utf8");
  const configSource = fs.readFileSync(FRONTEND_CONFIG, "utf8");
  return {
    destinations: jsToJson(extractJsConstant(dataSource, "destinationPlaces")),
    routes: jsToJson(extractJsConstant(dataSource, "featuredRoutes")),
    events: jsToJson(extractJsConstant(dataSource, "majorEvents")),
    statePhrases: jsToJson(extractJsConstant(configSource, "STATE_PHRASES")),
    emergencyContacts: jsToJson(extractJsConstant(configSource, "EMERGENCY_CONTACTS")),
    regionSeasons: jsToJson(extractJsConstant(configSource, "REGION_SEASONS")),
  };
}

function budgetBand(avgDailyCost, days = 3) {
  const low = Math.round(avgDailyCost * days * 0.82);
  const high = Math.round(avgDailyCost * days * 1.28);
  const label = avgDailyCost < 2800 ? "Budget" : avgDailyCost < 4200 ? "Mid-range" : "Premium";
  return { low, high, label };
}

function inferCrowd(place) {
  const crowded = new Set(["Goa", "Mumbai", "Jaipur", "Agra", "Varanasi", "Kolkata", "Hyderabad", "Puri", "Andaman"]);
  const moderate = new Set(["Udaipur", "Shimla", "Munnar", "Kochi", "Ooty", "Darjeeling", "Gangtok", "Shillong", "Rishikesh"]);
  if (crowded.has(place.name)) return "High";
  if (moderate.has(place.name)) return "Medium";
  return "Low";
}

function inferType(place) {
  const text = `${place.name} ${place.state} ${place.region} ${place.blurb} ${(place.tags || []).join(" ")}`.toLowerCase();
  if (/(beach|coast|island)/.test(text)) return "beach destination";
  if (/(wildlife|safari)/.test(text)) return "wildlife reserve";
  if (/(hill|mountain|tea|coffee|highland|altitude)/.test(text)) return "hill station";
  if (/(lake|backwater|water)/.test(text)) return "waterfront retreat";
  if (/(desert|sand)/.test(text)) return "desert city";
  if (/(spiritual|temple|ghat|monastery)/.test(text)) return "spiritual heritage city";
  if (/(nightlife|metro|city|food)/.test(text)) return "city break";
  return "heritage city";
}

function inferAvgDailyCost(place) {
  const baseMap = {
    "beach destination": 4200,
    "wildlife reserve": 3400,
    "hill station": 3600,
    "waterfront retreat": 3800,
    "desert city": 3200,
    "spiritual heritage city": 2800,
    "city break": 4300,
    "heritage city": 3000,
  };
  const crowdAdj = { Low: 0.92, Medium: 1.0, High: 1.12, "Very High": 1.22 };
  const type = inferType(place);
  return Math.round((baseMap[type] || 3200) * (crowdAdj[inferCrowd(place)] || 1.0));
}

function seasonForPlace(place) {
  if (["Andaman", "Goa", "Puri"].includes(place.name)) return "November to March";
  if (place.name === "Leh") return "June to September";
  if (["Shimla", "Ooty", "Munnar", "Coorg", "Darjeeling", "Gangtok"].includes(place.name)) return "October to March";
  if (["Jaipur", "Agra", "Varanasi", "Rishikesh", "Amritsar", "Kolkata", "Hyderabad", "Pune"].includes(place.name)) return "October to February";
  if (["Alappuzha", "Kochi"].includes(place.name)) return "November to February";
  if (["Rann of Kutch", "Gir"].includes(place.name)) return "November to February";
  return "Year-round with seasonal planning";
}

function buildDestinationProfile(place) {
  const avgDailyCost = inferAvgDailyCost(place);
  return {
    name: place.name,
    state: place.state,
    region: place.region,
    type: inferType(place),
    budget_range: budgetBand(avgDailyCost, 3),
    best_season: seasonForPlace(place),
    tags: place.tags,
    average_daily_cost: avgDailyCost,
    crowd_level: inferCrowd(place),
    description: place.blurb,
    highlights: place.highlights,
    transport: {
      airport: place.airport,
      rail: place.rail,
      road: place.road,
    },
    official_url: place.officialUrl,
    image: place.image,
  };
}

function enrichIntel(statePhrases, emergencyContacts) {
  const stateFood = {
    Rajasthan: ["dal baati churma", "ghewar", "laal maas"],
    Maharashtra: ["misal pav", "vada pav", "puran poli"],
    Goa: ["fish curry", "bebinca", "prawn balchão"],
    Kerala: ["appam stew", "puttu", "seafood curries"],
    Karnataka: ["bisi bele bath", "mysore pak", "akki rotti"],
    "Tamil Nadu": ["dosas", "filter coffee", "bajji"],
    Telangana: ["hyderabadi biryani", "haleem", "irani chai"],
    "West Bengal": ["kathi roll", "kosha mangsho", "rosogolla"],
    Uttarakhand: ["kafuli", "aloo ke gutke", "bal mithai"],
    "Jammu and Kashmir": ["wazwan", "kehwa", "gushtaba"],
    Ladakh: ["thukpa", "momos", "butter tea"],
    Gujarat: ["thepla", "dhokla", "dabeli"],
    Punjab: ["kulcha", "lassi", "butter chicken"],
    Odisha: ["pakhala", "khaja", "rasagola"],
    Meghalaya: ["jadoh", "smoked meats", "local cafés"],
    Assam: ["masor tenga", "pitha", "tea"],
    Sikkim: ["momos", "phagshapa", "thukpa"],
    "Andaman and Nicobar Islands": ["seafood", "coconut curries", "fresh fruit"],
  };
  const stateScams = {
    Rajasthan: ["Guide fee confusion", "Camel or jeep add-ons without clear pricing"],
    Maharashtra: ["Tourist cab surcharges", "Weekend package markups"],
    Goa: ["Beach shack menu inflation", "Taxi fare confusion"],
    Kerala: ["Houseboat upgrade pressure", "Unclear transfer charges"],
    Karnataka: ["Estate tour commissions", "Auto fare mismatches"],
    "Tamil Nadu": ["Cab price jumps", "Souvenir tins sold as premium"],
    Telangana: ["Food tour upsells", "Old city auto fare surprises"],
    "West Bengal": ["Festival-night ride inflation", "Restaurant menu swaps"],
    Uttarakhand: ["Adventure activity oversells", "Cab fare confusion on hills"],
    "Jammu and Kashmir": ["Houseboat add-on pressure", "Overpriced shikara rides"],
    Ladakh: ["Unclear taxi day rates", "Unverified gear rentals"],
    Gujarat: ["Market bundle pricing", "Guide commissions at viewpoints"],
    Punjab: ["Tourist cab pressure", "Dining add-ons near temple zones"],
    Odisha: ["Donation pressure", "Beach activity overcharging"],
    Meghalaya: ["Tourist cab bundling", "Over-priced viewpoint add-ons"],
    Assam: ["Safari broker markups", "Unverified transfer pricing"],
    Sikkim: ["Permit middlemen", "Lake transfer commission traps"],
    "Andaman and Nicobar Islands": ["Diving package upsells", "Ferry commission traps"],
  };
  const stateTips = {
    Rajasthan: "Start early to beat heat and long transfers.",
    Maharashtra: "Peak-hour buffers matter in the bigger cities.",
    Goa: "Scooters are best when your plan is compact.",
    Kerala: "Slow pacing wins here; don't overpack the route.",
    Karnataka: "Road trips work best with fewer, better stops.",
    "Tamil Nadu": "Hill routes need weather buffers.",
    Telangana: "Cluster food and heritage in the same neighbourhood.",
    "West Bengal": "Older districts reward walking and short hops.",
    Uttarakhand: "Weather can change quickly, so keep a fallback.",
    "Jammu and Kashmir": "Leave mountain buffers and keep plans flexible.",
    Ladakh: "Acclimatization is part of the itinerary.",
    Gujarat: "Perfect for road loops with food stops.",
    Punjab: "Short city stays work best with flexible timing.",
    Odisha: "Temple timing should shape the whole day.",
    Meghalaya: "Road time can be slower than it looks.",
    Assam: "Wildlife planning needs permit and weather buffers.",
    Sikkim: "Keep one buffer day for weather or permits.",
    "Andaman and Nicobar Islands": "Ferries and weather windows should drive the schedule.",
  };
  const intel = {};
  for (const [state, payload] of Object.entries(statePhrases)) {
    intel[state] = {
      language: payload.language,
      phrases: payload.phrases,
      food_specialties: stateFood[state] || [],
      scams_to_avoid: stateScams[state] || [],
      transport_tip: stateTips[state] || "",
      emergency: emergencyContacts[state] || emergencyContacts.default || {},
    };
  }
  return intel;
}

const ROUTE_BLUEPRINTS = [
  { name: "Royal Triangle", origin: "Delhi", destination: "Jaipur", days: 4, transport: "Train", theme: "heritage loop", best_for: ["culture", "food", "family"], day_focus: ["Arrive and settle into the old city", "Fort and palace day", "Market and café day", "Easy departure day"], savings_tip: "Choose train for balance and use central stays to cut transfers.", season_note: "Best in the cooler months when walking feels easy." },
  { name: "Golden Triangle Plus", origin: "Delhi", destination: "Agra", days: 5, transport: "Road", theme: "iconic north route", best_for: ["heritage", "photography", "food"], day_focus: ["Arrive and settle", "Sunrise monument day", "Museum and bazaar day", "Slow café and garden day", "Return with buffer"], savings_tip: "Keep one overnight near the center instead of switching hotels daily.", season_note: "Cool mornings make the Taj and old city easier to enjoy." },
  { name: "Royal Rajasthan Loop", origin: "Jaipur", destination: "Udaipur", days: 5, transport: "Road", theme: "palaces and lakes", best_for: ["luxury", "romance", "heritage"], day_focus: ["Fort start", "Palace and bazaar day", "Travel into lake country", "Boat and rooftop evening", "Easy return"], savings_tip: "Road travel works well if you want detours and craft shopping.", season_note: "Winter is best for comfortable road movement." },
  { name: "Desert to Dunes", origin: "Jaisalmer", destination: "Rann of Kutch", days: 5, transport: "Road", theme: "desert photography", best_for: ["photography", "adventure", "culture"], day_focus: ["Desert fort start", "Dune camp day", "Road into salt flats", "White desert sunrise", "Return with buffer"], savings_tip: "Book desert camps with full inclusions so you do not pay twice.", season_note: "Night skies and winter temperatures make this route strongest." },
  { name: "Sacred River Days", origin: "Varanasi", destination: "Agra", days: 4, transport: "Train", theme: "spiritual + heritage", best_for: ["spiritual", "culture", "photography"], day_focus: ["Dawn ghats", "Old city and temple day", "Travel into monument country", "Sunrise monument slot"], savings_tip: "Train keeps the route budget-friendly and reduces road fatigue.", season_note: "October to March gives the most comfortable sightseeing window." },
  { name: "Himalayan Reset", origin: "Rishikesh", destination: "Shimla", days: 6, transport: "Road", theme: "wellness and hills", best_for: ["wellness", "nature", "family"], day_focus: ["River calm", "Wellness and food day", "Transfer day", "Hill walk day", "Garden and café day", "Return buffer"], savings_tip: "If the budget is tight, keep one segment by train and the rest by road.", season_note: "Shoulder seasons reduce crowd pressure and keep the trip flexible." },
  { name: "North Frontier", origin: "Srinagar", destination: "Leh", days: 6, transport: "Road", theme: "high-altitude adventure", best_for: ["adventure", "photography", "road trip"], day_focus: ["Lake calm", "Acclimatize", "Road day", "Monastery day", "Scenic loop day", "Return buffer"], savings_tip: "Long transfers are easier when you keep one buffer day.", season_note: "Summer is the safest road window." },
  { name: "Food and Faith", origin: "Amritsar", destination: "Delhi", days: 3, transport: "Train", theme: "food-first city break", best_for: ["food", "spiritual", "culture"], day_focus: ["Golden temple morning", "Food crawl", "Return day"], savings_tip: "Train is the easiest way to keep this short and simple.", season_note: "Winter keeps the temple and street-food circuit comfortable." },
  { name: "Coastal Weekend", origin: "Mumbai", destination: "Goa", days: 4, transport: "Road", theme: "sea and nightlife", best_for: ["beach", "nightlife", "food"], day_focus: ["Leave city early", "Beach day", "Night market and café day", "Return buffer"], savings_tip: "If time is short, flights work better than road for this pair.", season_note: "November to February is the sweet spot." },
  { name: "Konkan Escape", origin: "Pune", destination: "Goa", days: 3, transport: "Road", theme: "short break", best_for: ["food", "beach", "road trip"], day_focus: ["Leave Pune early", "Beach and fort day", "Café return"], savings_tip: "Keep this simple and do not over-plan.", season_note: "Avoid monsoon if your plan depends on beach time." },
  { name: "Backwater and Tea Trail", origin: "Kochi", destination: "Munnar", days: 5, transport: "Road", theme: "green slow travel", best_for: ["nature", "romance", "food"], day_focus: ["Coast start", "Backwater lane", "Transfer to tea country", "Tea and viewpoint day", "Return buffer"], savings_tip: "Road transfer feels best when you are not squeezing too many stops.", season_note: "September to February gives the most comfortable weather." },
  { name: "Kerala Slow Arc", origin: "Alappuzha", destination: "Kochi", days: 4, transport: "Road", theme: "water and heritage", best_for: ["luxury", "nature", "culture"], day_focus: ["Houseboat day", "Shore and beach day", "Heritage and café day", "Easy return"], savings_tip: "Avoid too many transfers; this route works best with a calm pace.", season_note: "Cooler months are the most pleasant." },
  { name: "Temple and Ruins", origin: "Hampi", destination: "Mysuru", days: 5, transport: "Road", theme: "culture + family", best_for: ["culture", "photography", "family"], day_focus: ["Ruins at sunrise", "Temple and boulder day", "Transfer to palace city", "Palace and garden day", "Easy return"], savings_tip: "Road is useful because the route itself is part of the story.", season_note: "October to February gives the best weather for outdoor heritage." },
  { name: "Coffee Hills", origin: "Mysuru", destination: "Coorg", days: 4, transport: "Road", theme: "easy hill break", best_for: ["nature", "food", "road trip"], day_focus: ["Palace morning", "Transfer into coffee hills", "Estate day", "Return buffer"], savings_tip: "Road travel keeps the trip flexible and scenic.", season_note: "Winter and early spring are easiest." },
  { name: "Hill Station Pairing", origin: "Ooty", destination: "Coorg", days: 5, transport: "Road", theme: "cool weather break", best_for: ["nature", "romance", "family"], day_focus: ["Toy train and lake day", "Tea and garden day", "Transfer to coffee country", "Estate and waterfall day", "Return buffer"], savings_tip: "This works well when you want a calming, not hurried, route.", season_note: "October to March is ideal." },
  { name: "East India Peaks", origin: "Kolkata", destination: "Darjeeling", days: 5, transport: "Train", theme: "culture + hills", best_for: ["culture", "photography", "food"], day_focus: ["City food start", "Heritage lane day", "Transfer to tea country", "Sunrise hill day", "Return buffer"], savings_tip: "Train plus a hill transfer gives the best value.", season_note: "October to April keeps the hills clearer." },
  { name: "Northeast Loop", origin: "Gangtok", destination: "Shillong", days: 6, transport: "Road", theme: "mountains + cafés", best_for: ["nature", "road trip", "photography"], day_focus: ["Monastery morning", "Lake and market day", "Road into café country", "Viewpoint day", "Slow café day", "Return buffer"], savings_tip: "Road transport is the point here, not just the transfer.", season_note: "Avoid the wettest weeks if road certainty matters." },
  { name: "Wildlife Circuit", origin: "Kaziranga", destination: "Shillong", days: 5, transport: "Road", theme: "safari and scenic drives", best_for: ["wildlife", "adventure", "photography"], day_focus: ["Safari morning", "Tea estate day", "Road day", "Viewpoint and café day", "Return buffer"], savings_tip: "Road keeps the wildlife and hill segments connected cleanly.", season_note: "November to April is the best wildlife window." },
  { name: "Island Reset", origin: "Andaman", destination: "Andaman", days: 4, transport: "Flight", theme: "beach holiday", best_for: ["beach", "adventure", "romance"], day_focus: ["Beach day", "History day", "Water sports day", "Buffer day"], savings_tip: "Flight is the only sensible arrival mode here.", season_note: "Dry months matter a lot for sea visibility and ferry reliability." },
  { name: "Western Heritage Sprint", origin: "Mumbai", destination: "Udaipur", days: 5, transport: "Flight", theme: "premium city break", best_for: ["luxury", "culture", "food"], day_focus: ["City arrival", "Palace day", "Lake day", "Rooftop evening", "Return buffer"], savings_tip: "Flights save the most time on this pair.", season_note: "Winter gives the smoothest sightseeing rhythm." },
  { name: "Sacred South", origin: "Kochi", destination: "Puri", days: 6, transport: "Flight", theme: "culture and temple coast", best_for: ["spiritual", "culture", "beach"], day_focus: ["Coast start", "Heritage day", "Travel day", "Temple day", "Beach and food day", "Return buffer"], savings_tip: "Flights reduce the fatigue of a long cross-country route.", season_note: "Cooler months make temple and beach movement better." },
  { name: "Royal Mountain Contrast", origin: "Jaipur", destination: "Shimla", days: 6, transport: "Train", theme: "palace to pine", best_for: ["family", "culture", "nature"], day_focus: ["Royal city start", "Craft and food day", "Transfer to hills", "Hill walk day", "Tea and market day", "Return buffer"], savings_tip: "Train plus a last-mile road transfer gives a comfortable rhythm.", season_note: "October to March is the sweet spot for both ends." },
  { name: "Budget City Circuit", origin: "Pune", destination: "Hyderabad", days: 4, transport: "Train", theme: "food and city breaks", best_for: ["food", "culture", "nightlife"], day_focus: ["Food start", "Heritage day", "Biryani and market day", "Return buffer"], savings_tip: "Train keeps the budget under control and frees money for meals.", season_note: "October to February works well for food walks." },
];

function buildItineraries(destinationMap) {
  return ROUTE_BLUEPRINTS.map((spec) => {
    const dest = destinationMap[spec.destination];
    return {
      name: spec.name,
      origin: spec.origin,
      destination: spec.destination,
      days: spec.days,
      transport: spec.transport,
      theme: spec.theme,
      best_for: spec.best_for,
      season_note: spec.season_note,
      savings_tip: spec.savings_tip,
      budget: budgetBand(dest.average_daily_cost, spec.days),
      highlight_chain: dest.highlights,
      day_plan: spec.day_focus.map((step, idx) => ({
        day: idx + 1,
        morning: `${step}. Start with ${dest.highlights[idx % dest.highlights.length]}.`,
        afternoon: `Use the middle of the day for a stronger local experience around ${dest.highlights[(idx + 1) % dest.highlights.length]}.`,
        evening: `Finish with ${dest.food_specialties?.[0] || "local food"} and one slower stop.`,
      })),
    };
  });
}

function buildPayload() {
  const frontend = loadFrontendData();
  const destinations = frontend.destinations.map(buildDestinationProfile);
  const destinationMap = Object.fromEntries(destinations.map((item) => [item.name, item]));
  const itineraries = buildItineraries(destinationMap);
  return {
    generated_at: new Date().toISOString(),
    destinations,
    itineraries,
    local_intelligence: enrichIntel(frontend.statePhrases, frontend.emergencyContacts),
    cost_benchmarks: {
      transport: {
        bus_per_km: 2.5,
        train_per_km: 1.3,
        road_per_km: 3.8,
        flight_shorthaul: { low: 4500, high: 9800 },
        flight_mediumhaul: { low: 6500, high: 14500 },
      },
      stay: {
        budget: { low: 800, high: 2200 },
        mid_range: { low: 2500, high: 5500 },
        premium: { low: 6000, high: 18000 },
      },
      food: {
        budget: { low: 500, high: 900 },
        mid_range: { low: 1100, high: 2200 },
        premium: { low: 2500, high: 6000 },
      },
      crowd_penalty: { Low: 0.92, Medium: 1.0, High: 1.12, "Very High": 1.25 },
    },
  };
}

function main() {
  const payload = buildPayload();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(
      {
        generated_at: payload.generated_at,
        source_frontend: path.relative(ROOT, FRONTEND_DATA),
        source_config: path.relative(ROOT, FRONTEND_CONFIG),
        destination_count: payload.destinations.length,
        itinerary_count: payload.itineraries.length,
        states: Object.keys(payload.local_intelligence).sort(),
      },
      null,
      2
    ),
    "utf8"
  );
  for (const key of ["destinations", "itineraries", "local_intelligence", "cost_benchmarks"]) {
    fs.writeFileSync(path.join(OUT_DIR, `${key}.json`), JSON.stringify(payload[key], null, 2), "utf8");
  }
  console.log(`Wrote hackathon data pack to ${OUT_DIR}`);
}

main();
