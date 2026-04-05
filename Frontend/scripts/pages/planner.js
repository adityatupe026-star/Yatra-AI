import { interestOptions, destinationPlaces } from "../data/site-data.js";
import { EMERGENCY_CONTACTS, STATE_PHRASES } from "../core/config.js";
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

function paintVisitChips(holder, selected, place) {
  const options = getVisitSuggestions(place);
  holder.innerHTML = options.map((item) => `<button class="interest-chip ${selected.has(item) ? "active" : ""}" type="button" data-visit="${item}">${item}</button>`).join("");
  holder.querySelectorAll(".interest-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (selected.has(chip.dataset.visit)) selected.delete(chip.dataset.visit);
      else selected.add(chip.dataset.visit);
      paintVisitChips(holder, selected, place);
    });
  });
}

function updateRestaurantSuggestionList(placeName) {
  const datalist = document.getElementById("restaurantSuggestions");
  if (!datalist) return;
  datalist.innerHTML = getRestaurantSuggestions(placeName).map((name) => `<option value="${name}"></option>`).join("");
}

function renderRouteMemory(place, restaurantName, visitFocus = "") {
  const card = document.getElementById("routeMemoryCard");
  if (!card) return;
  if (!isDiningIntent(visitFocus)) {
    card.innerHTML = `<p class="eyebrow">YatraAI route memory</p><h3>Start fresh without losing old plans</h3><p>When you start a new trip, the current one is moved into history automatically.</p><div class="planner-memory-points"><div><strong>Current place</strong><span>${place.name}, ${place.state}</span></div><div><strong>Nearby style</strong><span>${place.highlights.slice(0, 2).join(", ")}</span></div><div><strong>Map note</strong><span>OpenStreetMap handles free routing and turn-by-turn guidance for road-led plans.</span></div></div><p class="route-note">Use the places-to-visit choices to unlock dining-led recommendations when you want them.</p>`;
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

function renderTripSupportCards(place) {
  const emergency = EMERGENCY_CONTACTS[place.state] || EMERGENCY_CONTACTS.default;
  return `
    <article class="sidebar-card booking-buttons-card">
      <p class="eyebrow">Book your trip</p>
      <h3>Complete your booking</h3>
      <div class="booking-buttons-grid">
        <button class="button button-primary booking-button" id="bookTicketsBtn" type="button">
          <span class="booking-icon">🎫</span>
          <span>Book Tickets</span>
        </button>
        <button class="button button-secondary booking-button" id="bookHotelsBtn" type="button">
          <span class="booking-icon">🏨</span>
          <span>Book Hotels</span>
        </button>
      </div>
    </article>
    <article class="sidebar-card">
      <p class="eyebrow">Emergency contacts</p>
      <h3>Keep these numbers handy</h3>
      <ul>
        <li>Tourist helpline: ${emergency.tourist}</li>
        <li>Police: ${emergency.police}</li>
        <li>Ambulance: ${emergency.ambulance}</li>
        <li>${emergency.note}</li>
      </ul>
    </article>
  `;
}

function updatePlannerSupportCards(place) {
  const holder = document.getElementById("plannerSupportCards");
  if (!holder) return;
  holder.innerHTML = renderTripSupportCards(place);
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
  if (!suggestions.length) {
    panel.classList.add("hidden-field");
    panel.classList.remove("planner-assist-open");
    return;
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
  updatePlannerSupportCards(plan.place);
  const transportPlan = buildTransportPlan(plan);
  const diningEnabled = isDiningIntent(plan.visitFocus, plan.nearbyFocus);
  const diningPlan = getDiningPlan(plan);
  const startCoords = findCoords(plan.start);
  const budget = buildBudgetBreakdown(plan, startCoords);
  const packingList = buildPackingList(plan);
  const co2Rates = { Air: 255, Road: 120, Train: 35 };
  const distanceKm = Number(budget.distanceKm || 0);
  const currentKg = (distanceKm * co2Rates[plan.mode]) / 1000;
  const trainKg = (distanceKm * co2Rates.Train) / 1000;
  const comparisonText = plan.mode === "Train"
    ? "This trip already uses the lowest-emission mode in this planner."
    : `Compared with train, this route is about ${(currentKg - trainKg).toFixed(1)} kg CO2 heavier.`;
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
    <article class="workflow-card carbon-card"><p class="eyebrow">Carbon check</p><h3>Estimated CO2 footprint</h3><div class="transport-step-grid budget-grid"><div class="transport-step-card"><strong>${plan.mode}</strong><p>${currentKg.toFixed(1)} kg CO2</p><small>${co2Rates[plan.mode]} g CO2 per km per person</small></div><div class="transport-step-card"><strong>Train baseline</strong><p>${trainKg.toFixed(1)} kg CO2</p><small>35 g CO2 per km per person</small></div><div class="transport-step-card budget-total-card"><strong>Comparison</strong><p>${plan.mode === "Train" ? "Best-in-class" : `${(currentKg / Math.max(trainKg, 0.1)).toFixed(1)}x train`}</p><small>${comparisonText}</small></div></div></article>
    <article class="workflow-card"><p class="eyebrow">Workflow</p><h3>How this trip flows</h3><div class="workflow-list">${plan.workflow.map((step, idx) => `<div class="workflow-item"><strong>${idx + 1}</strong><p>${step}</p></div>`).join("")}</div></article>
    <article class="workflow-card"><p class="eyebrow">Packing list</p><h3>What to carry for this trip</h3><div class="prompt-list">${packingList.map((item) => `<span class="prompt-chip">${item}</span>`).join("")}</div></article>
    <article class="route-card"><p class="eyebrow">YatraAI data policy</p><h3>Grounded planning</h3><p>YatraAI should use your own places, stays, routes, nearby picks and planning data as the source of truth, with Ollama handling local inference for trip planning and chat.</p></article>
  `;
  const mapLinks = document.getElementById("plannerMapLinks");
  if (mapLinks) {
    mapLinks.innerHTML = `<a class="button button-secondary" href="${buildGoogleMapsDirectionsLink(plan)}" target="_blank" rel="noreferrer">Open route in Google Maps</a><a class="button button-secondary" href="${buildGoogleMapsPlaceLink(plan.place)}" target="_blank" rel="noreferrer">Open destination in Google Maps</a><button class="button button-secondary" type="button" id="copyTripLink">Copy share link</button><button class="button button-secondary" type="button" id="downloadTripPdf">Export to PDF</button>`;
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
          <article class="planner-story-card"><p class="eyebrow">Stay logic</p><h3>Use booking filters</h3><p>Set stay preference for booking filters instead of planner recommendations.</p></article>
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
              <label>Stay preference<input id="stayPreference" type="text" placeholder="budget hotel, resort, hostel, family stay"><small class="field-helper">Used as a booking filter for stays and hotels.</small></label>
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
            </div>
            <label>Places to visit<input id="visitFocus" type="hidden"><small class="field-helper">Choose one or more destinations or visit styles from the chips below.</small></label>
            <div class="chip-row" id="visitFocusOptions"></div>
            <div class="planner-mini-grid">
              <article class="planner-mini-note"><strong>Nearby focus</strong><p>Open suggestions for cafes, forts, temples, shopping lanes, scenic pauses or destination neighborhoods.</p></article>
              <article class="planner-mini-note"><strong>Places to visit</strong><p>Select multiple options to shape the visit list for your route.</p></article>
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
      <aside class="planner-sidebar">
        <article class="sidebar-card route-memory-card" id="routeMemoryCard"></article>
        <article class="sidebar-card" id="plannerWeatherCard"><div class="weather-skeleton skeleton shimmer"></div></article>
        <div id="plannerSupportCards"></div>
      </aside>
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
  const visitHolder = document.getElementById("visitFocusOptions");
  const params = new URLSearchParams(window.location.search);
  const stayPreferenceInput = document.getElementById("stayPreference");
  const restaurantWrap = document.getElementById("restaurantPreferenceWrap");
  const restaurantNameInput = document.getElementById("restaurantName");
  const destinationInput = document.getElementById("plannerDestination");
  const nearbyFocusInput = document.getElementById("nearbyFocus");
  const visitFocusInput = document.getElementById("visitFocus");
  const assistPanel = document.getElementById("plannerAssistPanel");
  const assistClose = document.getElementById("plannerAssistClose");
  const selectedVisits = new Set();

  paintInterestChips(holder, selected);

  const syncVisitFocusSelection = (place) => {
    if (!visitHolder || !visitFocusInput) return;
    paintVisitChips(visitHolder, selectedVisits, place);
    visitFocusInput.value = Array.from(selectedVisits).join(", ");
  };

  const syncRestaurantPreference = () => {
    const activePlace = getPlace(destinationInput.value.trim() || "Pune");
    updateRestaurantSuggestionList(activePlace.name);
    const showRestaurantField = isDiningIntent(visitFocusInput.value);
    restaurantWrap.classList.toggle("hidden-field", !showRestaurantField);
    if (!showRestaurantField) restaurantNameInput.value = "";
    renderRouteMemory(activePlace, restaurantNameInput.value.trim(), visitFocusInput.value.trim());
    updatePlannerSupportCards(activePlace);
    syncVisitFocusSelection(activePlace);
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
    selectedVisits.clear();
    (plan.visitFocus || "").split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => selectedVisits.add(item));
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
      createdAtTs: Date.now(),
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

  bindAssist(nearbyFocusInput, "nearbyFocus");
  bindAssist(visitFocusInput, "visitFocus");
  stayPreferenceInput.addEventListener("input", syncRestaurantPreference);
  restaurantNameInput.addEventListener("input", syncRestaurantPreference);
  destinationInput.addEventListener("input", syncRestaurantPreference);
  destinationInput.addEventListener("change", syncRestaurantPreference);
  assistClose.addEventListener("click", hidePlannerAssist);
  assistPanel.addEventListener("click", (event) => {
    const chip = event.target.closest(".planner-assist-chip");
    if (!chip) return;
    const value = chip.dataset.value || "";
    if (document.activeElement === nearbyFocusInput) nearbyFocusInput.value = value;
    else if (document.activeElement === visitFocusInput) {
      selectedVisits.add(value);
      syncVisitFocusSelection(getPlace(destinationInput.value.trim() || "Pune"));
    }
    syncRestaurantPreference();
  });
  document.addEventListener("click", (event) => {
    const relevant = [stayPreferenceInput, nearbyFocusInput, visitFocusInput, restaurantNameInput, assistPanel, visitHolder];
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
  if (params.get("days")) document.getElementById("tripDays").value = params.get("days");
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
  syncVisitFocusSelection(getPlace(destinationInput.value.trim() || getPlan()?.place?.name || "Pune"));
  updatePlannerSupportCards(getPlace(destinationInput.value.trim() || getPlan()?.place?.name || "Pune"));

  // ── Booking Modals ──────────────────────────────────────────
  function getCurrentPlan() {
    return getPlan() || {};
  }

  // ── Ticket Data generators ───────────────────────────────────
  function getTrainData(from, to) {
    const trains = [
      { name: "Rajdhani Express", number: "12951", dep: "06:00", arr: "14:30", duration: "8h 30m", class: "AC 2-Tier", price: 1450, avail: 42, rating: 4.8 },
      { name: "Shatabdi Express", number: "12009", dep: "08:15", arr: "17:45", duration: "9h 30m", class: "Chair Car", price: 890, avail: 18, rating: 4.6 },
      { name: "Duronto Express", number: "12213", dep: "11:00", arr: "21:20", duration: "10h 20m", class: "AC 3-Tier", price: 1120, avail: 67, rating: 4.4 },
      { name: "Garib Rath", number: "12216", dep: "22:30", arr: "08:10+1", duration: "9h 40m", class: "AC 3-Tier Economy", price: 680, avail: 110, rating: 4.2 },
      { name: "Jan Shatabdi", number: "12059", dep: "14:45", arr: "23:00", duration: "8h 15m", class: "Second Seating", price: 380, avail: 204, rating: 3.9 },
    ];
    return trains.map(t => ({ ...t, from, to }));
  }

  function getBusData(from, to) {
    const buses = [
      { name: "VRL Travels", type: "Volvo Multi-Axle A/C Sleeper", dep: "21:00", arr: "06:30+1", duration: "9h 30m", price: 1200, avail: 8, rating: 4.7, amenities: ["WiFi", "Blanket", "Charging"] },
      { name: "SRS Travels", type: "Mercedes A/C Seater", dep: "07:30", arr: "16:00", duration: "8h 30m", price: 850, avail: 22, rating: 4.5, amenities: ["A/C", "Water", "Charging"] },
      { name: "KSRTC Airavat", type: "Club Class Semi-Sleeper", dep: "10:00", arr: "19:45", duration: "9h 45m", price: 650, avail: 35, rating: 4.3, amenities: ["A/C", "Pushback"] },
      { name: "Zingbus", type: "Volvo A/C Seater", dep: "15:30", arr: "00:30+1", duration: "9h 00m", price: 580, avail: 14, rating: 4.2, amenities: ["WiFi", "Snacks", "Charging"] },
      { name: "IntrCity SmartBus", type: "Economy Sleeper", dep: "23:00", arr: "08:45+1", duration: "9h 45m", price: 490, avail: 41, rating: 3.8, amenities: ["A/C", "Blanket"] },
    ];
    return buses.map(b => ({ ...b, from, to }));
  }

  function getFlightData(from, to) {
    const flights = [
      { name: "IndiGo", number: "6E-2341", dep: "06:10", arr: "08:25", duration: "2h 15m", class: "Economy", price: 4200, avail: 6, rating: 4.5, stops: "Non-stop" },
      { name: "Air India", number: "AI-441", dep: "09:45", arr: "12:05", duration: "2h 20m", class: "Economy", price: 5100, avail: 14, rating: 4.7, stops: "Non-stop" },
      { name: "SpiceJet", number: "SG-183", dep: "13:00", arr: "15:40", duration: "2h 40m", class: "Economy", price: 3850, avail: 28, rating: 4.1, stops: "Non-stop" },
      { name: "Vistara", number: "UK-875", dep: "17:15", arr: "19:30", duration: "2h 15m", class: "Economy Flex", price: 6200, avail: 4, rating: 4.8, stops: "Non-stop" },
      { name: "Akasa Air", number: "QP-1312", dep: "20:30", arr: "22:55", duration: "2h 25m", class: "Economy", price: 3400, avail: 33, rating: 4.0, stops: "Non-stop" },
    ];
    return flights.map(f => ({ ...f, from, to }));
  }

  function getHotelData(stayPref, budget, placeName) {
    const pref = (stayPref || "").toLowerCase();
    const budgetNum = Number(budget) || 12000;

    const allHotels = [
      { name: "The Grand Palace Hotel", type: "luxury", stars: 5, price: 8500, rating: 4.9, reviews: 1240, amenities: ["Spa", "Pool", "Fine Dining", "Concierge", "Gym"], tag: "Luxury Pick", highlight: "Award-winning heritage property" },
      { name: "Trident " + placeName, type: "luxury", stars: 5, price: 7200, rating: 4.8, reviews: 980, amenities: ["Pool", "Restaurant", "Bar", "Valet", "Butler"], tag: "Top Rated", highlight: "City-centre luxury with panoramic views" },
      { name: "Marriott " + placeName, type: "best", stars: 4, price: 4800, rating: 4.6, reviews: 2100, amenities: ["Pool", "Gym", "Breakfast", "Business Centre"], tag: "Best Value", highlight: "Consistent comfort and prime location" },
      { name: "Lemon Tree Premier", type: "best", stars: 4, price: 3600, rating: 4.4, reviews: 1760, amenities: ["Pool", "Restaurant", "Parking", "Gym"], tag: "Popular", highlight: "Modern rooms, walkable to main sights" },
      { name: "Ibis " + placeName, type: "best", stars: 3, price: 2400, rating: 4.2, reviews: 3200, amenities: ["Breakfast", "WiFi", "Gym", "Bar"], tag: "Smart Stay", highlight: "Reliable mid-range, great for solo travellers" },
      { name: "FabHotel Express", type: "budget", stars: 2, price: 1200, rating: 4.0, reviews: 4100, amenities: ["WiFi", "A/C", "TV"], tag: "Budget Friendly", highlight: "Clean, central and no-frills" },
      { name: "OYO Townhouse", type: "budget", stars: 2, price: 850, rating: 3.8, reviews: 5600, amenities: ["WiFi", "A/C", "Housekeeping"], tag: "Lowest Price", highlight: "Great for backpackers and short stays" },
      { name: "Zostel " + placeName, type: "hostel", stars: 2, price: 600, rating: 4.5, reviews: 2890, amenities: ["Common Area", "WiFi", "Lockers", "Events"], tag: "Hostel Fav", highlight: "Meet fellow travellers, social atmosphere" },
    ];

    let filtered = allHotels;

    if (pref.includes("luxury") || pref.includes("5 star") || pref.includes("premium")) {
      filtered = allHotels.filter(h => h.type === "luxury");
    } else if (pref.includes("hostel") || pref.includes("backpack")) {
      filtered = allHotels.filter(h => h.type === "hostel" || h.type === "budget");
    } else if (pref.includes("budget") || pref.includes("cheap") || pref.includes("economy")) {
      filtered = allHotels.filter(h => h.type === "budget" || (h.price <= budgetNum / 8));
    } else if (pref.includes("resort") || pref.includes("family")) {
      filtered = allHotels.filter(h => h.type === "best" || h.type === "luxury");
    } else {
      // default: filter by budget intelligently
      const perNightBudget = Math.round(budgetNum / 4);
      filtered = allHotels.filter(h => h.price <= perNightBudget * 1.3);
      if (!filtered.length) filtered = allHotels.slice(3);
    }

    return filtered.map(h => ({ ...h, place: placeName }));
  }

  // ── Modal HTML builders ─────────────────────────────────────
  function buildTicketsModal(plan) {
    const mode = plan.mode || "Train";
    const from = plan.start || "Your City";
    const to = plan.place?.name || "Destination";
    const icon = mode === "Train" ? "🚆" : mode === "Air" ? "✈️" : "🚌";
    const modeLabel = mode === "Train" ? "Trains" : mode === "Air" ? "Flights" : "Buses";

    let items = [];
    if (mode === "Train") items = getTrainData(from, to);
    else if (mode === "Air") items = getFlightData(from, to);
    else items = getBusData(from, to);

    const cards = mode === "Train" ? items.map(t => `
      <div class="bk-card">
        <div class="bk-card-top">
          <div class="bk-card-title">
            <span class="bk-transport-icon">🚆</span>
            <div>
              <strong>${t.name}</strong>
              <span class="bk-tag">#${t.number}</span>
            </div>
          </div>
          <div class="bk-price">₹${t.price.toLocaleString()}<small>/person</small></div>
        </div>
        <div class="bk-route-bar">
          <div class="bk-time-block"><strong>${t.dep}</strong><span>${t.from}</span></div>
          <div class="bk-duration-line"><span class="bk-dur-pill">${t.duration}</span><div class="bk-line"></div></div>
          <div class="bk-time-block"><strong>${t.arr}</strong><span>${t.to}</span></div>
        </div>
        <div class="bk-card-footer">
          <span class="bk-chip">${t.class}</span>
          <span class="bk-chip bk-avail">${t.avail} seats left</span>
          <span class="bk-chip bk-rating">⭐ ${t.rating}</span>
          <a class="bk-btn" href="https://www.irctc.co.in" target="_blank" rel="noreferrer">Book on IRCTC →</a>
        </div>
      </div>`) : mode === "Air" ? items.map(f => `
      <div class="bk-card">
        <div class="bk-card-top">
          <div class="bk-card-title">
            <span class="bk-transport-icon">✈️</span>
            <div>
              <strong>${f.name}</strong>
              <span class="bk-tag">${f.number} · ${f.stops}</span>
            </div>
          </div>
          <div class="bk-price">₹${f.price.toLocaleString()}<small>/person</small></div>
        </div>
        <div class="bk-route-bar">
          <div class="bk-time-block"><strong>${f.dep}</strong><span>${f.from}</span></div>
          <div class="bk-duration-line"><span class="bk-dur-pill">${f.duration}</span><div class="bk-line"></div></div>
          <div class="bk-time-block"><strong>${f.arr}</strong><span>${f.to}</span></div>
        </div>
        <div class="bk-card-footer">
          <span class="bk-chip">${f.class}</span>
          <span class="bk-chip bk-avail">${f.avail} seats left</span>
          <span class="bk-chip bk-rating">⭐ ${f.rating}</span>
          <a class="bk-btn" href="https://www.makemytrip.com/flights" target="_blank" rel="noreferrer">Book Now →</a>
        </div>
      </div>`) : items.map(b => `
      <div class="bk-card">
        <div class="bk-card-top">
          <div class="bk-card-title">
            <span class="bk-transport-icon">🚌</span>
            <div>
              <strong>${b.name}</strong>
              <span class="bk-tag">${b.type}</span>
            </div>
          </div>
          <div class="bk-price">₹${b.price.toLocaleString()}<small>/seat</small></div>
        </div>
        <div class="bk-route-bar">
          <div class="bk-time-block"><strong>${b.dep}</strong><span>${b.from}</span></div>
          <div class="bk-duration-line"><span class="bk-dur-pill">${b.duration}</span><div class="bk-line"></div></div>
          <div class="bk-time-block"><strong>${b.arr}</strong><span>${b.to}</span></div>
        </div>
        <div class="bk-card-footer">
          ${b.amenities.map(a => `<span class="bk-chip">${a}</span>`).join("")}
          <span class="bk-chip bk-avail">${b.avail} seats left</span>
          <span class="bk-chip bk-rating">⭐ ${b.rating}</span>
          <a class="bk-btn" href="https://www.redbus.in" target="_blank" rel="noreferrer">Book Now →</a>
        </div>
      </div>`);

    return `
      <div class="bk-modal-overlay" id="ticketsModalOverlay">
        <div class="bk-modal">
          <button class="bk-modal-close" id="ticketsModalClose" type="button">✕</button>
          <div class="bk-modal-header">
            <div class="bk-modal-badge">${icon} ${modeLabel}</div>
            <h2>Available <span class="bk-heading-hl">${modeLabel}</span></h2>
            <p class="bk-route-summary">${from} → ${to} · ${plan.days || 4} days trip</p>
          </div>
          <div class="bk-filter-bar">
            <span class="bk-filter-label">Sort by:</span>
            <button class="bk-filter-btn active" data-sort="price">💰 Price</button>
            <button class="bk-filter-btn" data-sort="rating">⭐ Rating</button>
            <button class="bk-filter-btn" data-sort="dep">🕐 Departure</button>
          </div>
          <div class="bk-list">${cards.join("")}</div>
          <p class="bk-disclaimer">Prices are indicative. Book on official platforms for real-time availability.</p>
        </div>
      </div>`;
  }

  function buildHotelsModal(plan) {
    const stayPref = plan.stayPreference || "comfortable hotel";
    const budget = plan.budget || 12000;
    const placeName = plan.place?.name || "Destination";
    const hotels = getHotelData(stayPref, budget, placeName);

    const prefLabel = (stayPref.toLowerCase().includes("luxury") || stayPref.toLowerCase().includes("5 star")) ? "Luxury"
      : stayPref.toLowerCase().includes("hostel") ? "Hostel / Backpacker"
      : stayPref.toLowerCase().includes("budget") ? "Budget"
      : stayPref.toLowerCase().includes("resort") ? "Resort"
      : "Best Match";

    const cards = hotels.map(h => `
      <div class="bk-card bk-hotel-card">
        <div class="bk-hotel-img-wrap">
          <div class="bk-hotel-img-placeholder">🏨</div>
          <span class="bk-hotel-tag">${h.tag}</span>
        </div>
        <div class="bk-hotel-body">
          <div class="bk-card-top">
            <div>
              <strong class="bk-hotel-name">${h.name}</strong>
              <div class="bk-stars">${"★".repeat(h.stars)}${"☆".repeat(5 - h.stars)}</div>
              <p class="bk-hotel-highlight">${h.highlight}</p>
            </div>
            <div class="bk-price">₹${h.price.toLocaleString()}<small>/night</small></div>
          </div>
          <div class="bk-amenities">
            ${h.amenities.map(a => `<span class="bk-chip">${a}</span>`).join("")}
          </div>
          <div class="bk-card-footer">
            <span class="bk-chip bk-rating">⭐ ${h.rating} <span class="bk-review-count">(${h.reviews.toLocaleString()})</span></span>
            <a class="bk-btn" href="https://www.makemytrip.com/hotels" target="_blank" rel="noreferrer">View &amp; Book →</a>
          </div>
        </div>
      </div>`);

    return `
      <div class="bk-modal-overlay" id="hotelsModalOverlay">
        <div class="bk-modal">
          <button class="bk-modal-close" id="hotelsModalClose" type="button">✕</button>
          <div class="bk-modal-header">
            <div class="bk-modal-badge">🏨 Hotels</div>
            <h2>Hotels in <span class="bk-heading-hl">${placeName}</span></h2>
            <p class="bk-route-summary">Filtered for: ${prefLabel} · Budget ₹${Number(budget).toLocaleString()}</p>
          </div>
          <div class="bk-filter-bar">
            <span class="bk-filter-label">Filter:</span>
            <button class="bk-filter-btn active" data-hfilter="all">All</button>
            <button class="bk-filter-btn" data-hfilter="luxury">Luxury</button>
            <button class="bk-filter-btn" data-hfilter="best">Mid-range</button>
            <button class="bk-filter-btn" data-hfilter="budget">Budget</button>
          </div>
          <div class="bk-list">${cards.join("")}</div>
          <p class="bk-disclaimer">Prices are per night per room. Check availability on the booking platform.</p>
        </div>
      </div>`;
  }

  // ── Modal injection & lifecycle ─────────────────────────────
  function openTicketsModal() {
    const plan = getCurrentPlan();
    const existing = document.getElementById("ticketsModalOverlay");
    if (existing) existing.remove();
    document.body.insertAdjacentHTML("beforeend", buildTicketsModal(plan));
    document.body.style.overflow = "hidden";
    document.getElementById("ticketsModalClose").addEventListener("click", closeTicketsModal);
    document.getElementById("ticketsModalOverlay").addEventListener("click", e => { if (e.target.id === "ticketsModalOverlay") closeTicketsModal(); });
  }

  function closeTicketsModal() {
    document.getElementById("ticketsModalOverlay")?.remove();
    if (!document.getElementById("hotelsModalOverlay")) document.body.style.overflow = "";
  }

  function openHotelsModal() {
    const plan = getCurrentPlan();
    const existing = document.getElementById("hotelsModalOverlay");
    if (existing) existing.remove();
    document.body.insertAdjacentHTML("beforeend", buildHotelsModal(plan));
    document.body.style.overflow = "hidden";
    document.getElementById("hotelsModalClose").addEventListener("click", closeHotelsModal);
    document.getElementById("hotelsModalOverlay").addEventListener("click", e => { if (e.target.id === "hotelsModalOverlay") closeHotelsModal(); });
  }

  function closeHotelsModal() {
    document.getElementById("hotelsModalOverlay")?.remove();
    if (!document.getElementById("ticketsModalOverlay")) document.body.style.overflow = "";
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeTicketsModal(); closeHotelsModal(); }
  });

  // Use event delegation so buttons work after re-renders
  document.addEventListener("click", e => {
    if (e.target.closest("#bookTicketsBtn")) openTicketsModal();
    if (e.target.closest("#bookHotelsBtn")) openHotelsModal();
  });
}
