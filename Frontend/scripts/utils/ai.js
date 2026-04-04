import { API_CONFIG, REGION_SEASONS } from "../core/config.js";
import { getPlan } from "../core/state.js";
import { destinationPlaces, featuredRoutes } from "../data/site-data.js";
import { formatInline } from "./helpers.js";

function findPlaceMention(text) {
  const lowered = String(text || "").toLowerCase();
  return (
    destinationPlaces.find((place) => lowered.includes(place.name.toLowerCase()))
    || destinationPlaces.find((place) => lowered.includes(place.state.toLowerCase()))
    || null
  );
}

export function planContextText() {
  const plan = getPlan();
  if (!plan) return "No current trip saved.";
  const season = REGION_SEASONS[plan.place.region];
  const nearby = destinationPlaces
    .filter((place) => place.region === plan.place.region && place.name !== plan.place.name)
    .slice(0, 3)
    .map((place) => place.name);
  return `Current trip: ${plan.start} to ${plan.place.name} by ${plan.mode}, ${plan.days} days, budget Rs.${plan.budget}, vibe ${plan.vibe}, interests ${(plan.interests || []).join(", ")}, highlights ${(plan.place.highlights || []).join(", ")}, nearby ${nearby.join(", ") || "none"}, best season ${season?.bestMonths || "n/a"}.`;
}

export function demoResponse(prompt, includeTripContext = true) {
  const tripHint = includeTripContext && getPlan()
    ? `\n\nCurrent trip context: ${getPlan().start} to ${getPlan().place.name} by ${getPlan().mode}.`
    : "";
  const text = prompt.toLowerCase();
  const place = findPlaceMention(prompt);
  const interestMap = [
    ["beach", "Beach"],
    ["beaches", "Beach"],
    ["culture", "Culture"],
    ["heritage", "Culture"],
    ["food", "Food"],
    ["romance", "Romance"],
    ["romantic", "Romance"],
    ["adventure", "Adventure"],
    ["nature", "Nature"],
    ["wildlife", "Wildlife"],
    ["spiritual", "Spiritual"],
    ["wellness", "Wellness"],
    ["shopping", "Shopping"],
    ["nightlife", "Nightlife"],
    ["luxury", "Luxury"],
    ["family", "Family"],
    ["photography", "Photography"],
    ["road trip", "Road Trip"],
  ];
  const interests = interestMap.filter(([needle]) => text.includes(needle)).map(([, label]) => label);

  if (!place && /where should i go|where to go|recommend|suggest|best place|trip idea|i prefer|i want|choose a destination/.test(text)) {
    const picks = destinationPlaces.filter((item) => !interests.length || item.tags.some((tag) => interests.includes(tag))).slice(0, 3);
    return `**Best place picks**\n\n${picks.map((item) => `**${item.name}**\n- Why it fits: ${item.blurb}\n- Best for: ${(item.tags || []).slice(0, 3).join(", ")}\n- Highlights: ${(item.highlights || []).slice(0, 3).join(", ")}\n- Access: ${item.airport}, ${item.rail}, ${item.road}\n- Why YatraAI: it explains why the place fits and turns it into a route.`).join("\n\n")}\n\nNext step: tell me your budget, days and vibe, and I will turn one of these places into a full trip plan.${tripHint}`;
  }

  if (text.includes("budget")) {
    if (place) {
      return `**Budget guide for ${place.name}**\n\n- Transport: match the mode to your time and comfort.\n- Stay: pick a central zone so you spend less on transfers.\n- Food: keep one premium meal and balance the rest.\n- Buffer: leave room for tickets, taxis and small surprises.\n- Why it helps: ${place.blurb}\n- YatraAI value: it turns the place into a practical budget band, not a random estimate.${tripHint}`;
    }
    return `Budget guide\n\n- Keep transport and stay as the biggest slices.\n- Use one premium anchor meal and save on the rest.\n- Leave a buffer for tickets, taxis and small surprises.${tripHint}`;
  }

  if (text.includes("weather") || text.includes("rain") || text.includes("season")) {
    if (place) {
      return `**Weather note for ${place.name}**\n\n- Best season: ${place.best_season || "Year-round with seasonal planning"}\n- Pack one light layer and one rain-friendly backup.\n- Keep a flexible half-day if the region is coastal or hill-based.\n- Why YatraAI: it links weather to route timing, not just a forecast.\n- Next step: ask for a month-by-month trip window.${tripHint}`;
    }
    return `Weather note\n\n- Check the best season for the region before locking dates.\n- Pack one light layer and one rain-friendly backup.\n- If the trip is coastal or hill-based, build in flexible timing.${tripHint}`;
  }

  if (text.includes("food") || text.includes("eat") || text.includes("restaurant")) {
    if (place) {
      const foods = destinationPlaces.find((item) => item.name === place.name)
        ? (getPlan()?.place?.highlights || place.highlights || [])
        : [];
      return `**Food plan for ${place.name}**\n\n- Try: ${(foods || []).slice(0, 3).join(", ") || "signature local dishes"}\n- Add one premium dinner stop and one relaxed local lunch.\n- Pair meals with ${place.highlights?.[0] || "a major landmark"} so the day stays efficient.\n- Why YatraAI: it connects food to the route and the neighborhood.\n- Next step: ask for a food-first itinerary.${tripHint}`;
    }
    return `Food plan\n\n- Start with a signature local dish.\n- Add one premium dinner stop and one street-food stop.\n- Keep a short walk between meals and the next sight.${tripHint}`;
  }

  if (text.includes("packing") || text.includes("carry") || text.includes("what to bring")) {
    if (place) {
      return `**Packing list for ${place.name}**\n\n- ID, charger, power bank and comfortable shoes.\n- Add weather-specific layers and a small first-aid kit.\n- Include one offline map screenshot and one booking screenshot.\n- Why YatraAI: it personalizes the list to the place and season.${tripHint}`;
    }
    return `Packing list\n\n- ID, charger, power bank and comfortable shoes.\n- Add weather-specific layers and a small first-aid kit.\n- Keep offline screenshots for maps and bookings.${tripHint}`;
  }

  if (text.includes("event") || text.includes("festival")) {
    if (place) {
      return `**Event strategy for ${place.name}**\n\n- Book early if the timing is festival-heavy.\n- Expect crowds near the biggest rituals or parades.\n- Pair the event with one quieter nearby day before or after.\n- Why YatraAI: it helps you plan around the event instead of just showing the date.${tripHint}`;
    }
    return `Event strategy\n\n- Book early if the timing is festival-heavy.\n- Expect crowds near the biggest rituals or parades.\n- Pair the event with a quieter nearby day before or after.${tripHint}`;
  }

  if (text.includes("how to go") || text.includes("transport")) {
    if (place) {
      return `**Transport guide for ${place.name}**\n\n- Train: budget-friendly and comfortable on popular routes.\n- Bus: good value for direct intercity travel.\n- Cab: best for flexibility and scenic stops.\n- Why YatraAI: it shows the route logic and the best mode for your time budget.${tripHint}`;
    }
    return `Transport guide\n\n- Train: budget-friendly and comfortable on popular routes.\n- Bus: good value for direct intercity travel.\n- Cab: best for flexibility and scenic stops.\n\nBest pick\nChoose train for savings, cab or self-drive for convenience.${tripHint}`;
  }

  if (text.includes("near")) {
    if (place) {
      const nearby = destinationPlaces
        .filter((item) => item.region === place.region && item.name !== place.name)
        .slice(0, 3)
        .map((item) => item.name);
      return `**Nearby picks for ${place.name}**\n\n- ${nearby.join("\n- ")}\n- Start with one landmark and one food cluster.\n- Add a sunset stop or market lane.\n- Keep one flexible evening slot for dining or shopping.\n- Why YatraAI: it turns a city into a useful circuit, not an isolated point.${tripHint}`;
    }
    return `Nearby picks\n\n- Start with one landmark and one food cluster.\n- Add a sunset stop or market lane.\n- Keep one flexible evening slot for dining or shopping.${tripHint}`;
  }

  if (text.includes("tell me about") || text.includes("overview")) {
    if (place) {
      const nearby = destinationPlaces
        .filter((item) => item.region === place.region && item.name !== place.name)
        .slice(0, 3)
        .map((item) => item.name);
      return `**${place.name} overview**\n\n- Why go: ${place.blurb}\n- Best season: ${place.best_season || "Year-round with seasonal planning"}\n- Highlights: ${(place.highlights || []).slice(0, 3).join(", ")}\n- Nearby places: ${nearby.join(", ") || "other regional stops"}\n- Access: ${place.airport}, ${place.rail}, ${place.road}\n- Why YatraAI: it turns a known place into a route with timing, nearby pairings and budget logic.\n- Next step: ask me for a 3-day plan, budget band or food-first route.${tripHint}`;
    }
    return `Place overview\n\nThis spot works as both a sightseeing stop and a mood-setter for the trip.\n\nWhy it fits\nIt gives you a strong visual identity, practical access and enough nearby options to extend the route.${tripHint}`;
  }

  if (place) {
    const nearby = destinationPlaces
      .filter((item) => item.region === place.region && item.name !== place.name)
      .slice(0, 3)
      .map((item) => item.name);
    return `**${place.name} route brief**\n\n- Why go: ${place.blurb}\n- Best season: ${place.best_season || "Year-round with seasonal planning"}\n- Top highlights: ${(place.highlights || []).slice(0, 3).join(", ")}\n- Nearby pairings: ${nearby.join(", ") || "other regional stops"}\n- Access: ${place.airport}, ${place.rail}, ${place.road}\n- Best for: ${(place.tags || []).slice(0, 3).join(", ") || "balanced travel"}\n- Why YatraAI: it turns a known city into a route with season, access, budget and nearby logic.\n- Next step: ask for budget, day count or food style and I'll turn this into a plan.${tripHint}`;
  }

  return `Trip sketch\n\nDay 1\n- Arrival and check-in\n- Landmark visit\n- Evening food stop\n\nDay 2\n- Culture-heavy route\n- Scenic midday break\n- Premium dinner or local dining cluster\n\nDay 3\n- Nearby exploration or road-trip extension\n\nWhy it fits\nThis route balances discovery, food and visual highlights while keeping the pace practical.${tripHint}`;
}

export async function queryBackend(prompt, options = {}) {
  const useTripContext = options.useTripContext ?? true;
  const responseMode = useTripContext ? "trip" : "expert";
  const context = {
    featuredRoutes,
    places: destinationPlaces.map((place) => ({
      name: place.name,
      state: place.state,
      region: place.region,
      tags: place.tags,
      highlights: place.highlights,
      airport: place.airport,
      rail: place.rail,
      road: place.road,
      lat: place.lat,
      lng: place.lng,
    })),
  };
  if (options.sessionId) {
    context.sessionId = options.sessionId;
  }
  if (useTripContext) {
    context.trip = getPlan();
  }
  const backendPayload = {
    prompt,
    model: API_CONFIG.model,
    maxTokens: 1600,
    context,
    responseMode,
  };
  const ollamaPayload = {
    model: API_CONFIG.model,
    stream: false,
    prompt: `You are YatraAI, an India ${useTripContext ? "travel planning assistant" : "travel and tourism expert"}.\nUse this structured context when answering:\n${JSON.stringify(context)}\n\nUser prompt:\n${prompt}\n\nRules: be destination-specific, explain why each place matters, include nearby places, season, access and budget logic, and avoid generic travel filler. Use clear section headings and detailed bullets. If the user already knows the city, explain why YatraAI would still help by turning it into a route, not just a name. If the user asks where to go, recommend actual destinations first and explain why each one fits.`,
  };
  const candidates = [
    { endpoint: API_CONFIG.chatEndpoint, body: backendPayload, expect: "chat" },
    { endpoint: API_CONFIG.ollamaEndpoint, body: ollamaPayload, expect: "ollama" },
  ];
  for (const candidate of candidates) {
    if (!candidate.endpoint) continue;
    try {
      const response = await fetch(candidate.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidate.body),
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (candidate.expect === "chat" && data?.response) return data.response;
      if (candidate.expect === "ollama" && data?.response) return data.response;
    } catch {
      continue;
    }
  }
  return demoResponse(prompt, useTripContext);
}

export function renderChatBody(content, role) {
  if (role === "user") return `<p class="chat-body-paragraph">${formatInline(content)}</p>`;
  const blocks = String(content || "").trim().split(/\n\s*\n/).filter(Boolean);
  return blocks
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return "";
      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul class="chat-list">${lines.map((line) => `<li>${formatInline(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      if (lines.length > 1 && lines.slice(1).every((line) => /^[-*]\s+/.test(line))) {
        return `<section class="chat-rich-block"><h4>${formatInline(lines[0].replace(/:$/, ""))}</h4><ul class="chat-list">${lines.slice(1).map((line) => `<li>${formatInline(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul></section>`;
      }
      if (/^(day\s*\d+|transport guide|nearby picks|place overview|trip sketch|why it fits|current trip context|smart suggestion|stay suggestion|budget note|next step|best pick)/i.test(lines[0])) {
        const heading = lines[0].replace(/:$/, "");
        const rest = lines.slice(1).join(" ");
        return `<section class="chat-rich-block"><h4>${formatInline(heading)}</h4>${rest ? `<p class="chat-body-paragraph">${formatInline(rest)}</p>` : ""}</section>`;
      }
      return `<p class="chat-body-paragraph">${formatInline(lines.join(" "))}</p>`;
    })
    .join("");
}
