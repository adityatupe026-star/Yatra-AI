import { API_CONFIG } from "../core/config.js";
import { getPlan } from "../core/state.js";
import { destinationPlaces, featuredRoutes } from "../data/site-data.js";
import { formatInline } from "./helpers.js";

export function planContextText() {
  const plan = getPlan();
  if (!plan) return "No current trip saved.";
  return `Current trip: ${plan.start} to ${plan.place.name} by ${plan.mode}, ${plan.days} days, budget Rs.${plan.budget}, vibe ${plan.vibe}, interests ${(plan.interests || []).join(", ")}.`;
}

export function demoResponse(prompt) {
  const tripHint = getPlan() ? `\n\nCurrent trip context: ${getPlan().start} to ${getPlan().place.name} by ${getPlan().mode}.` : "";
  const text = prompt.toLowerCase();
  if (text.includes("how to go") || text.includes("transport")) return `Transport guide\n\n- Train: budget-friendly and comfortable on popular routes.\n- Bus: good value for direct intercity travel.\n- Cab: best for flexibility and scenic stops.\n\nBest pick\nChoose train for savings, cab or self-drive for convenience.${tripHint}`;
  if (text.includes("near")) return `Nearby picks\n\n- Start with one landmark and one food cluster.\n- Add a sunset stop or market lane.\n- Keep one flexible evening slot for dining or shopping.${tripHint}`;
  if (text.includes("tell me about") || text.includes("overview")) return `Place overview\n\nThis spot works as both a sightseeing stop and a mood-setter for the trip.\n\nWhy it fits\nIt gives you a strong visual identity, practical access and enough nearby options to extend the route.${tripHint}`;
  return `Trip sketch\n\nDay 1\n- Arrival and check-in\n- Landmark visit\n- Evening food stop\n\nDay 2\n- Culture-heavy route\n- Scenic midday break\n- Premium dinner or local dining cluster\n\nDay 3\n- Nearby exploration or road-trip extension\n\nWhy it fits\nThis route balances discovery, food and visual highlights while keeping the pace practical.${tripHint}`;
}

export async function queryBackend(prompt) {
  if (!API_CONFIG.endpoint) return demoResponse(prompt);
  const context = {
    trip: getPlan(),
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
    })),
  };
  const response = await fetch(API_CONFIG.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: API_CONFIG.model,
      stream: false,
      prompt: `You are YatraAI, an India travel planning assistant.\nUse this structured context when answering:\n${JSON.stringify(context)}\n\nUser prompt:\n${prompt}`,
    }),
  });
  if (!response.ok) throw new Error("Backend unavailable");
  const data = await response.json();
  return data.response || demoResponse(prompt);
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
