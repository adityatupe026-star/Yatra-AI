import { API_CONFIG, REGION_SEASONS } from "../core/config.js";
import { getPlan } from "../core/state.js";
import { destinationPlaces } from "../data/site-data.js";
import { formatInline } from "./helpers.js";

export function planContextText() {
  const plan = getPlan();
  if (!plan) return "No current trip saved.";
  const season = REGION_SEASONS[plan.place.region];
  const nearby = destinationPlaces.filter((place) => place.region === plan.place.region && place.name !== plan.place.name).slice(0, 3).map((place) => place.name);
  return `Current trip: ${plan.start} to ${plan.place.name} by ${plan.mode}, ${plan.days} days, budget Rs.${plan.budget}, vibe ${plan.vibe}, interests ${(plan.interests || []).join(", ")}, highlights ${(plan.place.highlights || []).join(", ")}, nearby ${nearby.join(", ") || "none"}, best season ${season?.bestMonths || "n/a"}.`;
}

export function demoResponse(prompt, includeTripContext = true) {
  const tripHint = includeTripContext && getPlan() ? `\n\nCurrent trip context: ${getPlan().start} to ${getPlan().place.name} by ${getPlan().mode}.` : "";
  const text = prompt.toLowerCase();
  if (text.includes("budget")) return `Budget guide\n\n- Keep transport and stay as the biggest slices.\n- Use one premium anchor meal and save on the rest.\n- Leave a buffer for tickets, taxis and small surprises.${tripHint}`;
  if (text.includes("weather") || text.includes("rain") || text.includes("season")) return `Weather note\n\n- Check the best season for the region before locking dates.\n- Pack one light layer and one rain-friendly backup.\n- If the trip is coastal or hill-based, build in flexible timing.${tripHint}`;
  if (text.includes("food") || text.includes("eat") || text.includes("restaurant")) return `Food plan\n\n- Start with a signature local dish.\n- Add one premium dinner stop and one street-food stop.\n- Keep a short walk between meals and the next sight.${tripHint}`;
  if (text.includes("packing") || text.includes("carry") || text.includes("what to bring")) return `Packing list\n\n- ID, charger, power bank and comfortable shoes.\n- Add weather-specific layers and a small first-aid kit.\n- Keep offline screenshots for maps and bookings.${tripHint}`;
  if (text.includes("event") || text.includes("festival")) return `Event strategy\n\n- Book early if the timing is festival-heavy.\n- Expect crowds near the biggest rituals or parades.\n- Pair the event with a quieter nearby day before or after.${tripHint}`;
  if (text.includes("how to go") || text.includes("transport")) return `Transport guide\n\n- Train: budget-friendly and comfortable on popular routes.\n- Bus: good value for direct intercity travel.\n- Cab: best for flexibility and scenic stops.\n\nBest pick\nChoose train for savings, cab or self-drive for convenience.${tripHint}`;
  if (text.includes("near")) return `Nearby picks\n\n- Start with one landmark and one food cluster.\n- Add a sunset stop or market lane.\n- Keep one flexible evening slot for dining or shopping.${tripHint}`;
  if (text.includes("tell me about") || text.includes("overview")) return `Place overview\n\nThis spot works as both a sightseeing stop and a mood-setter for the trip.\n\nWhy it fits\nIt gives you a strong visual identity, practical access and enough nearby options to extend the route.${tripHint}`;
  return `Trip sketch\n\nDay 1\n- Arrival and check-in\n- Landmark visit\n- Evening food stop\n\nDay 2\n- Culture-heavy route\n- Scenic midday break\n- Premium dinner or local dining cluster\n\nDay 3\n- Nearby exploration or road-trip extension\n\nWhy it fits\nThis route balances discovery, food and visual highlights while keeping the pace practical.${tripHint}`;
}

export async function queryBackend(prompt, options = {}) {
  const useTripContext = options.useTripContext ?? true;
  const responseMode = useTripContext ? "trip" : "expert";
  const context = {};
  if (options.sessionId) {
    context.sessionId = options.sessionId;
  }
  if (useTripContext) {
    context.trip = getPlan();
  }
  const backendPayload = {
    prompt,
    model: API_CONFIG.model,
    context,
    responseMode,
    maxTokens: options.maxTokens || 4096,
  };
  try {
    const response = await fetch(API_CONFIG.chatEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendPayload),
    });
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    const data = await response.json();
    if (data?.response) return data.response;
    throw new Error("Backend did not return a chat response.");
  } catch (error) {
    throw new Error(error?.message || "YatraAI backend is unavailable. Start the backend first.");
  }
}

export function renderChatBody(content, role) {
  if (role === "user") return `<p class="chat-body-paragraph">${formatInline(content)}</p>`;
  const blocks = String(content || "").trim().split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block) => {
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
  }).join("");
}
