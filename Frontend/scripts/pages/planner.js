import { interestOptions, destinationPlaces } from "../data/site-data.js";
import { archiveCurrentPlan, getPlan, setPlan } from "../core/state.js";
import { findCoords, formatCurrency, getPlace } from "../utils/helpers.js";
import { isDiningIntent, isRestaurantPreference, getRestaurantSuggestions, getNearbySuggestions } from "../utils/restaurants.js";
import { fetchWeather } from "../utils/weather.js";
import { showToast } from "../components/toast.js";
import {
  buildBudgetBreakdown,
  buildPackingList,
  buildWorkflow,
  buildTransportPlan,
  buildGoogleMapsDirectionsLink,
  buildGoogleMapsPlaceLink,
  decodeSharePlan,
  drawRouteMap,
  encodeSharePlan,
  estimateCost,
  estimateTime,
  getDiningPlan,
  getModeRecommendation,
  getStaySuggestion,
  transportIcon,
} from "../utils/travel.js";

const plannerMapState = {};
let plannerReadOnly = false;

function getVisitSuggestions(place) {
  const related = destinationPlaces.filter((item) => item.region === place.region && item.name !== place.name).slice(0, 6);
  const placeHighlights = place.highlights.map((item) => `${place.name}: ${item}`);
  const regionalAdds = related.map((item) => `${item.name}: ${item.highlights[0]}`);
  return [...placeHighlights, ...regionalAdds].slice(0, 10);
}

function paintInterestChips(holder, selected) {
  holder.innerHTML = interestOptions.map((interest) => `<button class="interest-chip ${selected.has(interest) ? "active" : ""}" type="button" data-interest="${interest}">${interest}</button>`).join("");
  holder.querySelectorAll(".interest-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (selected.has(chip.dataset.interest)) selected.delete(chip.dataset.interest);
      else selected.add(chip.dataset.interest);
      paintInterestChips(holder, selected);
    });
  });
}

function updateRestaurantSuggestionList(placeName) {
  const datalist = document.getElementById("restaurantSuggestions");
  if (!datalist) return;
  datalist.innerHTML = getRestaurantSuggestions(placeName).map((name) => `<option value="${name}"></option>`).join("");
}

function renderRouteMemory(place, stayPreference, restaurantName, visitFocus = "") {
  const card = document.getElementById("routeMemoryCard");
  if (!card) return;
  if (!isDiningIntent(stayPreference, visitFocus)) {
    card.innerHTML = `<p class="eyebrow">YatraAI route memory</p><h3>Start fresh without losing old plans</h3><p>When you start a new trip, the current one is moved into history automatically.</p><div class="planner-memory-points"><div><strong>Current place</strong><span>${place.name}, ${place.state}</span></div><div><strong>Nearby style</strong><span>${place.highlights.slice(0, 2).join(", ")}</span></div><div><strong>Map note</strong><span>OpenStreetMap handles free routing and turn-by-turn guidance for road-led plans.</span></div></div><p class="route-note">Switch stay preference or places to visit to <strong>restro</strong> whenever you want dining-led recommendations here.</p>`;
    return;
  }
  const suggestions = getRestaurantSuggestions(place.name);
  card.innerHTML = `
    <p class="eyebrow">YatraAI route memory</p>
    <h3>Top 10 restaurant ideas for ${place.name}</h3>
    <p>${restaurantName ? `You asked for ${restaurantName}. Here are similar restaurant ideas and strong dining backups.` : `Your planner now includes dining intent, so these picks can influence where you stay and what you visit.`}</p>
    <div class="restaurant-picks grid gap-3 md:grid-cols-2">
      ${suggestions.map((name, index) => `<div class="restaurant-pick-chip"><strong>${index + 1}</strong><span>${name}</span></div>`).join("")}
    </div>
    <p class="route-note">Tip: cluster one landmark, one market lane and one dinner stop in the same area for a smoother day.</p>
  `;
}

function showPlannerAssist(fieldKey, place, currentValue) {
  const panel = document.getElementById("plannerAssistPanel");
  const title = document.getElementById("plannerAssistTitle");
  const eyebrow = document.getElementById("plannerAssistEyebrow");
  const copy = document.getElementById("plannerAssistCopy");
  const grid = document.getElementById("plannerAssistGrid");
  if (!panel || !title || !eyebrow || !copy || !grid) return;
  let suggestions = [];
  let heading = "Suggestions";
  let text = "Destination-aware picks for this field.";
  if (fieldKey === "stayPreference") {
    const restaurantMode = isRestaurantPreference(currentValue);
    suggestions = restaurantMode ? getRestaurantSuggestions(place.name) : [`Central ${place.name} hotel district`, `${place.name} luxury stay zone`, `${place.name} family stay area`, `${place.name} budget hotel cluster`, `${place.name} heritage stay`, `${place.name} transit-friendly stay`];
    heading = restaurantMode ? `Top dining anchors for ${place.name}` : `Stay suggestions for ${place.name}`;
    text = restaurantMode ? "Choose one restaurant-led area and let the evening plan orbit around it." : "Pick a stay direction that matches your pace and budget.";
  }
  if (fieldKey === "nearbyFocus") {
    suggestions = getNearbySuggestions(place, currentValue);
    heading = `Nearby focus ideas for ${place.name}`;
    text = "Nearby focus shapes what you cluster around your destination.";
  }
  if (fieldKey === "visitFocus") {
    const restaurantMode = isRestaurantPreference(currentValue);
    suggestions = restaurantMode ? getRestaurantSuggestions(place.name) : getVisitSuggestions(place);
    heading = restaurantMode ? `Dining places to visit in ${place.name}` : `Places to visit in and around ${place.name}`;
    text = restaurantMode ? "Dining intent is active, so these restaurant picks will influence the actual planner cards too." : "These are the strongest destination highlights and nearby regional add-ons.";
  }
  eyebrow.textContent = "Smart suggestions";
  title.textContent = heading;
  copy.textContent = text;
  grid.innerHTML = suggestions.map((item, index) => `<button class="planner-assist-chip" type="button" data-value="${item.replace(/"/g, "&quot;")}"><strong>${index + 1}</strong><span>${item}</span></button>`).join("");
  panel.classList.remove("hidden-field");
  panel.classList.add("planner-assist-open");
}

function hidePlannerAssist() {
  const panel = document.getElementById("plannerAssistPanel");
  if (!panel) return;
  panel.classList.add("hidden-field");
  panel.classList.remove("planner-assist-open");
}

function renderPlan(plan) {
  const transportPlan = buildTransportPlan(plan);
  const diningEnabled = isDiningIntent(plan.stayPreference, plan.visitFocus, plan.nearbyFocus);
  const diningPlan = getDiningPlan(plan);
  const startCoords = findCoords(plan.start);
  const budget = buildBudgetBreakdown(plan, startCoords);
  const packingList = buildPackingList(plan);
  document.getElementById("routeOutput").innerHTML = `
    <article class="route-card hero-route planner-hero-card">
      <div class="planner-hero-copy">
        <p class="eyebrow">${plan.mode} trip</p>
        <h2>${plan.start} to ${plan.place.name}</h2>
        <p>${plan.place.blurb}</p>
      </div>
      <div class="planner-hero-stats">
        <div><strong>${plan.days}</strong><span>Days</span></div>
        <div><strong>Rs.${plan.budget}</strong><span>Budget</span></div>
        <div><strong>${estimateTime(plan.mode)}</strong><span>Travel time</span></div>
        <div><strong>${diningEnabled ? "Dining-led" : "Classic"}</strong><span>Trip flavor</span></div>
      </div>
    </article>
    <div class="route-grid">
      <article class="route-card"><span>01</span><h3>Trip setup</h3><p>${plan.days} days · Budget Rs.${plan.budget} · Stay: ${plan.stayPreference || "flexible"} · Vibe: ${plan.vibe}</p></article>
      <article class="route-card transport-card"><span>02</span><h3>${transportIcon(plan.mode)} mode overview</h3><p>${transportPlan.summary}</p><p>Estimated cost: ${estimateCost(plan.mode)}<br>Estimated time: ${estimateTime(plan.mode)}</p></article>
      <article class="route-card"><span>03</span><h3>Travel access</h3><p>Air: ${plan.place.airport}<br>Train: ${plan.place.rail}<br>Road: ${plan.place.road}</p></article>
      <article class="route-card"><span>04</span><h3>Stay and nearby plan</h3><p>${getStaySuggestion(plan)} Nearby focus: ${plan.nearbyFocus || "local highlights"}.</p></article>
      <article class="route-card"><span>05</span><h3>Places to visit</h3><p>${plan.visitFocus || plan.place.highlights.join(", ")}</p></article>
      <article class="route-card ${diningEnabled ? "route-card-dining" : ""}"><span>06</span><h3>${diningEnabled ? "Dining-led plan" : "Smart suggestion"}</h3><p>${diningEnabled ? diningPlan.summary : getModeRecommendation(plan)}</p><p>${diningEnabled ? `Featured dining stop: ${diningPlan.chosen}.` : transportPlan.bookingNote}</p></article>
    </div>
    ${diningEnabled ? `<article class="workflow-card dining-plan-card"><p class="eyebrow">Dining flow</p><h3>Restaurants now influence this trip</h3><div class="transport-step-grid">${diningPlan.picks.map((pick, idx) => `<div class="transport-step-card dining-step-card"><strong>Dining stop ${idx + 1}</strong><p>${pick}</p></div>`).join("")}</div><p class="route-note">${diningPlan.note}</p></article>` : ""}
    <article class="workflow-card"><p class="eyebrow">Budget calculator</p><h3>Estimated trip spend</h3><div class="transport-step-grid budget-grid"><div class="transport-step-card"><strong>Transport</strong><p>${formatCurrency(budget.transport.low)} to ${formatCurrency(budget.transport.high)}</p><small>${budget.distanceKm} km estimated distance</small></div><div class="transport-step-card"><strong>Stay</strong><p>${formatCurrency(budget.stay.low)} to ${formatCurrency(budget.stay.high)}</p><small>Based on ${plan.stayPreference || "standard"} stay type</small></div><div class="transport-step-card"><strong>Food</strong><p>${formatCurrency(budget.food.low)} to ${formatCurrency(budget.food.high)}</p><small>Dining intensity changes this range</small></div><div class="transport-step-card"><strong>Activities</strong><p>${formatCurrency(budget.activities.low)} to ${formatCurrency(budget.activities.high)}</p><small>Sightseeing, tickets and local experiences</small></div><div class="transport-step-card budget-total-card"><strong>Total</strong><p>${formatCurrency(budget.total.low)} to ${formatCurrency(budget.total.high)}</p><small>Use as a practical planning band, not a final booking quote</small></div></div></article>
    <article class="workflow-card transport-summary-card"><p class="eyebrow">Transport plan</p><h3>${plan.mode} route breakdown</h3><div class="transport-step-grid">${transportPlan.steps.map((step, idx) => `<div class="transport-step-card"><strong>Step ${idx + 1}</strong><p>${step}</p></div>`).join("")}</div></article>
    <article class="workflow-card"><p class="eyebrow">Workflow</p><h3>How this trip flows</h3><div class="workflow-list">${plan.workflow.map((step, idx) => `<div class="workflow-item"><strong>${idx + 1}</strong><p>${step}</p></div>`).join("")}</div></article>
    <article class="workflow-card"><p class="eyebrow">Packing list</p><h3>What to carry for this trip</h3><div class="prompt-list">${packingList.map((item) => `<span class="prompt-chip">${item}</span>`).join("")}</div></article>
    <article class="route-card"><p class="eyebrow">YatraAI data policy</p><h3>Grounded planning</h3><p>YatraAI should use your own places, stays, routes, nearby picks and planning data as the source of truth, with Ollama handling local inference for trip planning and chat.</p></article>
  `;
  const mapLinks = document.getElementById("plannerMapLinks");
  if (mapLinks) {
    mapLinks.innerHTML = `<a class="button button-secondary" href="${buildGoogleMapsDirectionsLink(plan)}" target="_blank" rel="noreferrer">Open route in Google Maps</a><a class="button button-secondary" href="${buildGoogleMapsPlaceLink(plan.place)}" target="_blank" rel="noreferrer">Open destination in Google Maps</a><button class="button button-secondary" type="button" id="copyTripLink">Copy share link</button><button class="button button-secondary" type="button" id="downloadTripPdf">Download PDF</button>`;
  }
  document.getElementById("copyTripLink")?.addEventListener("click", async () => {
    const url = `${window.location.origin}${window.location.pathname}?trip=${encodeURIComponent(encodeSharePlan(plan))}`;
    await navigator.clipboard.writeText(url);
    showToast("Shareable trip link copied.", "success");
  });
  document.getElementById("downloadTripPdf")?.addEventListener("click", () => {
    const content = document.getElementById("routeOutput")?.innerHTML || "";
    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>YatraAI Itinerary</title><style>body{font-family:Arial,sans-serif;padding:24px;line-height:1.6}h2,h3{margin:0 0 12px}article{border:1px solid #ddd;padding:18px;margin-bottom:18px;border-radius:12px}.prompt-chip{display:inline-block;border:1px solid #ddd;padding:6px 10px;border-radius:999px;margin:4px}</style></head><body><h1>YatraAI Itinerary</h1>${content}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  });
  drawRouteMap("plannerMap", plan, plannerMapState).then((routeMeta) => {
    const nav = document.getElementById("navigationSteps");
    if (!nav || !routeMeta) return;
    if (routeMeta.isSimulated) {
      nav.innerHTML = `<article class="workflow-card"><p class="eyebrow">Navigation</p><h3>${plan.mode} route guidance</h3><div class="step-list">${routeMeta.transportPlan.steps.map((step, index) => `<div class="step-item"><strong>${index + 1}</strong><p>${step}</p><small>${plan.mode === "Train" ? "Transit segment" : plan.mode === "Air" ? "Flight segment" : "Route segment"}</small></div>`).join("")}</div></article>`;
      return;
    }
    const steps = (routeMeta.steps || []).slice(0, 12);
    nav.innerHTML = `<article class="workflow-card"><p class="eyebrow">Navigation</p><h3>Turn-by-turn route guidance</h3><div class="step-list">${steps.length ? steps.map((step, index) => `<div class="step-item"><strong>${index + 1}</strong><p>${step.maneuver.instruction || step.name || "Continue on the route"}</p><small>${step.distance ? `${(step.distance / 1000).toFixed(1)} km` : ""}</small></div>`).join("") : `<div class="step-item"><p>Navigation steps are not available for this route.</p></div>`}</div></article>`;
  }).catch(() => {
    const nav = document.getElementById("navigationSteps");
    if (nav) nav.innerHTML = `<article class="workflow-card"><p class="eyebrow">Navigation</p><h3>Route guidance unavailable</h3><p>We could not load turn-by-turn steps for this route.</p></article>`;
  });
}

async function renderWeather(place) {
  const holder = document.getElementById("plannerWeatherCard");
  if (!holder) return;
  holder.innerHTML = `<div class="weather-skeleton skeleton shimmer"></div>`;
  try {
    const weather = await fetchWeather(place.lat, place.lng);
    holder.innerHTML = `<p class="eyebrow">Live weather</p><h3>${place.name} today</h3><div class="planner-memory-points"><div><strong>${weather.temperature}°C</strong><span>${weather.min}° to ${weather.max}° range</span></div><div><strong>${weather.rainChance}% rain chance</strong><span>${weather.verdict}</span></div></div>`;
  } catch {
    holder.innerHTML = `<p class="eyebrow">Live weather</p><h3>Weather unavailable</h3><p>Open-Meteo could not return a forecast right now.</p>`;
  }
}

export function plannerMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">YatraAI planner</p><h1>Plan a trip from your own inputs</h1><p>Build a route, shape your stay, unlock nearby suggestions and let dining intent influence the final plan when it matters.</p></section>
    <section class="section planner-layout single-top">
      <div class="ai-console">
        <form id="plannerForm" class="quick-planner">
          <div class="planner-story-strip">
            <article class="planner-story-card planner-story-card-primary"><p class="eyebrow">Trip brief</p><h3>Build the route first</h3><p>Start city, destination, travel mode, days and budget create the backbone for the whole itinerary.</p></article>
            <article class="planner-story-card"><p class="eyebrow">Stay logic</p><h3>Unlock smart stay ideas</h3><p>Write hotel, resort, hostel, family stay or <strong>restro</strong> to trigger dining-aware suggestions.</p></article>
            <article class="planner-story-card"><p class="eyebrow">Explore layer</p><h3>Shape what happens nearby</h3><p>Nearby focus and places to visit use one shared suggestion frame only when you focus those boxes.</p></article>
          </div>
          <div class="planner-section-block">
            <div class="planner-section-head"><p class="eyebrow">Section 01</p><h3>Trip essentials</h3></div>
            <div class="quick-grid triple">
              <label>Start from<input id="startCity" type="text" placeholder="Mumbai"></label>
              <label>Destination<input id="plannerDestination" list="placeSuggestions" type="text" placeholder="Jaipur, Goa, Pune, Leh"></label>
              <label>Travel mode<select id="travelMode"><option value="Air">By air</option><option value="Road">By road</option><option value="Train">By train</option></select></label>
            </div>
            <label>Multi-city stops<input id="tripStops" type="text" placeholder="Optional: Goa, Hampi, Bengaluru"><small class="field-helper">Add comma-separated extra stops if you want a multi-city workflow.</small></label>
            <div class="quick-grid triple">
              <label>Days<input id="tripDays" type="number" min="1" max="21" value="4"></label>
              <label>Budget<input id="tripBudget" type="number" min="1000" step="500" value="12000"></label>
              <label>Stay preference<input id="stayPreference" type="text" placeholder="budget hotel, resort, hostel, family stay or restro"><small class="field-helper">Type <strong>restro</strong> or <strong>restaurant</strong> to unlock restaurant-name planning.</small></label>
            </div>
          </div>
          <div class="quick-grid planner-conditional-grid hidden-field planner-conditional-box" id="restaurantPreferenceWrap">
            <label>Restaurant name<input id="restaurantName" list="restaurantSuggestions" type="text" placeholder="Paradise Biryani, Trishna, local fine-dining choice"><small class="field-helper">This appears when your stay preference or places-to-visit plan looks restaurant-focused.</small></label>
          </div>
          <div class="planner-section-block planner-section-block-soft">
            <div class="planner-section-head"><p class="eyebrow">Section 02</p><h3>Experience builder</h3></div>
            <div class="quick-grid triple">
              <label>Travel vibe<input id="travelVibe" type="text" placeholder="relaxed, luxury, adventure"></label>
              <label>Nearby focus<input id="nearbyFocus" type="text" placeholder="cafes, forts, temples, shopping"></label>
              <label>Places to visit<input id="visitFocus" type="text" placeholder="heritage, food streets, museums or restro"></label>
            </div>
            <div class="planner-mini-grid">
              <article class="planner-mini-note"><strong>Nearby focus</strong><p>Open suggestions for cafes, forts, temples, shopping lanes, scenic pauses or destination neighborhoods.</p></article>
              <article class="planner-mini-note"><strong>Places to visit</strong><p>Use this for landmarks, museums, food streets, heritage areas or <strong>restro</strong> when dining should shape the plan.</p></article>
            </div>
            <div class="planner-assist-frame hidden-field" id="plannerAssistPanel">
              <div class="planner-assist-head"><div><p class="eyebrow" id="plannerAssistEyebrow">Smart suggestions</p><h3 id="plannerAssistTitle">Suggestions</h3></div><button class="button button-secondary planner-assist-close" id="plannerAssistClose" type="button">Close</button></div>
              <p class="section-note" id="plannerAssistCopy">Focus a planner field to get destination-aware suggestions.</p>
              <div class="planner-assist-grid" id="plannerAssistGrid"></div>
            </div>
          </div>
          <label>Interests<div class="chip-row" id="plannerInterests"></div></label>
          <div class="hero-actions planner-actions">
            <button class="button button-primary" type="submit">Generate Route</button>
            <button class="button button-secondary" type="button" id="startNewTrip">Start New Trip</button>
          </div>
        </form>
        <datalist id="placeSuggestions">${destinationPlaces.map((p) => `<option value="${p.name}"></option>`).join("")}</datalist>
        <datalist id="restaurantSuggestions"></datalist>
      </div>
      <aside class="planner-sidebar"><article class="sidebar-card route-memory-card" id="routeMemoryCard"></article><article class="sidebar-card" id="plannerWeatherCard"><div class="weather-skeleton skeleton shimmer"></div></article></aside>
    </section>
    <section class="section">
      <div class="planner-map-wrap"><div id="plannerMap" class="planner-map"></div></div>
      <div class="map-link-bar" id="plannerMapLinks"></div>
      <div class="route-output" id="routeOutput"></div>
      <div class="navigation-steps" id="navigationSteps"></div>
    </section>
  `;
}

export function initPlanner() {
  plannerReadOnly = false;
  const selected = new Set(["Culture", "Food"]);
  const form = document.getElementById("plannerForm");
  if (!form) return;
  const holder = document.getElementById("plannerInterests");
  const params = new URLSearchParams(window.location.search);
  const stayPreferenceInput = document.getElementById("stayPreference");
  const restaurantWrap = document.getElementById("restaurantPreferenceWrap");
  const restaurantNameInput = document.getElementById("restaurantName");
  const destinationInput = document.getElementById("plannerDestination");
  const nearbyFocusInput = document.getElementById("nearbyFocus");
  const visitFocusInput = document.getElementById("visitFocus");
  const assistPanel = document.getElementById("plannerAssistPanel");
  const assistClose = document.getElementById("plannerAssistClose");

  paintInterestChips(holder, selected);

  const syncRestaurantPreference = () => {
    const activePlace = getPlace(destinationInput.value.trim() || "Pune");
    updateRestaurantSuggestionList(activePlace.name);
    const showRestaurantField = isDiningIntent(stayPreferenceInput.value, visitFocusInput.value);
    restaurantWrap.classList.toggle("hidden-field", !showRestaurantField);
    if (!showRestaurantField) restaurantNameInput.value = "";
    renderRouteMemory(activePlace, stayPreferenceInput.value, restaurantNameInput.value.trim(), visitFocusInput.value.trim());
  };

  const bindAssist = (field, fieldKey) => {
    field.addEventListener("focus", () => showPlannerAssist(fieldKey, getPlace(destinationInput.value.trim() || "Pune"), field.value.trim()));
    field.addEventListener("input", () => showPlannerAssist(fieldKey, getPlace(destinationInput.value.trim() || "Pune"), field.value.trim()));
  };

  const populateFormFromPlan = (plan) => {
    document.getElementById("startCity").value = plan.start || "";
    destinationInput.value = plan.place?.name || "";
    document.getElementById("travelMode").value = plan.mode || "Road";
    document.getElementById("tripStops").value = (plan.stops || []).join(", ");
    document.getElementById("tripDays").value = plan.days || 4;
    document.getElementById("tripBudget").value = plan.budget || 12000;
    stayPreferenceInput.value = plan.stayPreference || "";
    restaurantNameInput.value = plan.restaurantName || "";
    document.getElementById("travelVibe").value = plan.vibe || "";
    nearbyFocusInput.value = plan.nearbyFocus || "";
    visitFocusInput.value = plan.visitFocus || "";
    selected.clear();
    (plan.interests || []).forEach((interest) => selected.add(interest));
    if (!selected.size) {
      selected.add("Culture");
      selected.add("Food");
    }
    paintInterestChips(holder, selected);
  };

  const capturePlan = () => {
    const place = getPlace(destinationInput.value.trim() || "Pune");
    const mode = document.getElementById("travelMode").value;
    const start = document.getElementById("startCity").value.trim() || "Your city";
    return {
      id: Date.now(),
      start,
      place,
      mode,
      days: document.getElementById("tripDays").value,
      budget: document.getElementById("tripBudget").value,
      stayPreference: stayPreferenceInput.value.trim() || "comfortable hotel",
      restaurantName: restaurantNameInput.value.trim(),
      vibe: document.getElementById("travelVibe").value.trim() || "balanced",
      nearbyFocus: nearbyFocusInput.value.trim() || "nearby highlights",
      visitFocus: visitFocusInput.value.trim() || place.highlights.join(", "),
      interests: Array.from(selected),
      stops: document.getElementById("tripStops").value.split(",").map((item) => item.trim()).filter(Boolean),
      workflow: buildWorkflow(mode, start, place),
      createdAt: new Date().toLocaleString(),
    };
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const label = button.textContent;
    button.textContent = "Planning...";
    button.classList.add("is-loading");
    const plan = capturePlan();
    if (plan.stops.length) {
      plan.workflow = [...plan.workflow.slice(0, 1), ...plan.stops.map((stop, index) => `Continue to stop ${index + 1}: ${stop}.`), ...plan.workflow.slice(1)];
    }
    setPlan(plan);
    renderPlan(plan);
    renderWeather(plan.place);
    showToast("Route generated successfully.", "success");
    button.textContent = label;
    button.classList.remove("is-loading");
  });

  bindAssist(stayPreferenceInput, "stayPreference");
  bindAssist(nearbyFocusInput, "nearbyFocus");
  bindAssist(visitFocusInput, "visitFocus");
  stayPreferenceInput.addEventListener("input", syncRestaurantPreference);
  restaurantNameInput.addEventListener("input", syncRestaurantPreference);
  destinationInput.addEventListener("input", syncRestaurantPreference);
  destinationInput.addEventListener("change", syncRestaurantPreference);
  visitFocusInput.addEventListener("input", syncRestaurantPreference);
  assistClose.addEventListener("click", hidePlannerAssist);
  assistPanel.addEventListener("click", (event) => {
    const chip = event.target.closest(".planner-assist-chip");
    if (!chip) return;
    const value = chip.dataset.value || "";
    if (document.activeElement === stayPreferenceInput) stayPreferenceInput.value = value;
    else if (document.activeElement === nearbyFocusInput) nearbyFocusInput.value = value;
    else visitFocusInput.value = value;
    syncRestaurantPreference();
  });
  document.addEventListener("click", (event) => {
    const relevant = [stayPreferenceInput, nearbyFocusInput, visitFocusInput, restaurantNameInput, assistPanel];
    if (!relevant.some((node) => node && node.contains(event.target))) hidePlannerAssist();
  });

  document.getElementById("startNewTrip").addEventListener("click", () => {
    archiveCurrentPlan();
    form.reset();
    document.getElementById("tripDays").value = 4;
    document.getElementById("tripBudget").value = 12000;
    document.getElementById("routeOutput").innerHTML = `<article class="route-card empty-state"><p class="eyebrow">New trip started</p><h3>Your previous plan was saved to history</h3><p>Pick a destination, mode and interests to generate a fresh route.</p></article>`;
    document.getElementById("navigationSteps").innerHTML = "";
    document.getElementById("plannerMapLinks").innerHTML = "";
    document.getElementById("plannerWeatherCard").innerHTML = `<div class="weather-skeleton skeleton shimmer"></div>`;
    syncRestaurantPreference();
    showToast("Started a fresh trip.", "default");
  });

  const destinationFromQuery = params.get("destination");
  const sharedTrip = params.get("trip");
  const decodedTrip = sharedTrip ? decodeSharePlan(sharedTrip) : null;
  if (destinationFromQuery) destinationInput.value = destinationFromQuery;
  if (params.get("new") === "1") archiveCurrentPlan();
  if (decodedTrip) {
    plannerReadOnly = true;
    populateFormFromPlan(decodedTrip);
    renderPlan(decodedTrip);
    renderWeather(decodedTrip.place);
    showToast("Opened a shared trip in read-only mode.", "default");
  } else if (getPlan() && params.get("new") !== "1" && !destinationFromQuery) {
    populateFormFromPlan(getPlan());
    renderPlan(getPlan());
    renderWeather(getPlan().place);
  } else {
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  }
  if (plannerReadOnly) {
    form.querySelectorAll("input, select, textarea, button[type='submit']").forEach((node) => {
      if (node.id !== "startNewTrip") node.setAttribute("disabled", "disabled");
    });
  }
  syncRestaurantPreference();
}
