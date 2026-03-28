import { page, API_CONFIG, HOME_SLIDES, CITY_COORDS } from "./core/config.js";
import {
  archiveCurrentPlan,
  getChatId,
  getChats,
  getPlan,
  getPlanHistory,
  setChatId,
  setChats,
  setPlan,
  setPlanHistory,
} from "./core/state.js";
import {
  destinationPlaces,
  featuredRoutes,
  interestOptions,
  majorEvents,
} from "./data/site-data.js";

let plannerMap;
let plannerRouteLayer;
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const getPlace = (name) => destinationPlaces.find((p) => p.name === name) || destinationPlaces[0];
const findCoords = (name) => {
  const place = destinationPlaces.find((p) => p.name.toLowerCase() === String(name).toLowerCase());
  if (place) return [place.lat, place.lng, place.name];
  if (CITY_COORDS[name]) return [CITY_COORDS[name][0], CITY_COORDS[name][1], name];
  return [22.5937, 78.9629, name || "India"];
};

function nav() {
  return `
    <header class="topbar">
      <a class="brand" href="./index.html"><span class="brand-mark">Y</span><span><strong>YatraAI</strong><small>India, Reimagined</small></span></a>
      <nav class="nav">
        <a href="./index.html">Home</a>
        <a href="./destinations.html">Destinations</a>
        <a href="./events.html">Events</a>
        <a href="./planner.html">Plan Trip</a>
        <a href="./chat.html">AI Chat</a>
        <a href="./explorer.html">Explorer</a>
        <a href="./map.html">India Map</a>
        <a href="./history.html">History</a>
      </nav>
      <a class="nav-cta" href="./planner.html?new=1">Plan Now</a>
    </header>
  `;
}

function footer() {
  return `
    <footer class="site-footer">
      <p>YatraAI for India travel planning, events, maps and Ollama-powered discovery.</p>
      <div>
        <a href="./destinations.html">30 Places</a>
        <a href="./events.html">Top Events</a>
        <a href="./planner.html">Trip Planner</a>
        <a href="./chat.html">AI Chat</a>
        <a href="./history.html">Saved Trips</a>
      </div>
    </footer>
  `;
}

function placeCard(place) {
  return `
    <article class="destination-card">
      <div class="destination-media" style="background-image:url('${place.image}')"></div>
      <div class="destination-copy">
        <p class="eyebrow">${place.region} - ${place.state}</p>
        <h3>${place.name}</h3>
        <p>${place.blurb}</p>
        <div class="meta">${place.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        <a class="inline-link" href="${place.officialUrl}" target="_blank" rel="noreferrer">Official tourism page</a>
      </div>
    </article>
  `;
}

function miniPlaceCard(placeName, tone) {
  const place = getPlace(placeName);
  return `
    <article class="mini-destination-card ${tone || ""}">
      <div class="mini-destination-media" style="background-image:url('${place.image}')"></div>
      <div class="mini-destination-copy">
        <p class="eyebrow">${place.region} - ${place.state}</p>
        <h3>${place.name}</h3>
        <p>${place.blurb}</p>
        <div class="meta">${place.tags.slice(0, 3).map((tag) => `<span>${tag}</span>`).join("")}</div>
      </div>
    </article>
  `;
}

function routeSpotlightCard(route, index) {
  const lead = getPlace(route.places[0]);
  return `
    <article class="route-spotlight-card">
      <div class="route-spotlight-media" style="background-image:url('${lead.image}')"></div>
      <div class="route-spotlight-copy">
        <p class="eyebrow">Featured route 0${index + 1}</p>
        <h3>${route.title}</h3>
        <p>${route.vibe}</p>
        <div class="route-line">${route.places.map((place) => `<span>${place}</span>`).join("")}</div>
      </div>
    </article>
  `;
}

function inspirationCard(title, text, href, kicker) {
  return `
    <a class="inspiration-card" href="${href}">
      <p class="eyebrow">${kicker}</p>
      <h3>${title}</h3>
      <p>${text}</p>
      <span class="inline-link">Open page</span>
    </a>
  `;
}

function eventCard(event, index) {
  return `
    <article class="event-card ${index === 0 ? "event-card-featured" : ""}">
      <div class="event-card-media" style="background-image:url('${event.image}')"></div>
      <div class="event-card-copy">
        <p class="eyebrow">${event.type}</p>
        <h3>${event.name}</h3>
        <p>${event.blurb}</p>
        <div class="meta">
          <span>${event.location}</span>
          <span>${event.timing}</span>
        </div>
      </div>
    </article>
  `;
}

function buildGoogleMapsDirectionsLink(plan) {
  const origin = encodeURIComponent(plan.start || "India");
  const destination = encodeURIComponent(`${plan.place.name}, ${plan.place.state}`);
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
}

function buildGoogleMapsPlaceLink(place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.state}`)}`;
}

function homePage() {
  const spotlightPlaces = ["Jaipur", "Goa", "Leh", "Alappuzha"];
  const editorialPlaces = ["Mumbai", "Varanasi", "Munnar"];
  return `
    <section class="hero legacy-hero">
      <div class="hero-media" id="homeHeroMedia" style="background-image:url('${HOME_SLIDES[0][2]}')"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <p class="eyebrow">Plan a trip</p>
        <h1 id="homeHeroTitle">${HOME_SLIDES[0][0]}</h1>
        <p class="hero-copy" id="homeHeroCopy">${HOME_SLIDES[0][1]}</p>
        <div class="hero-actions">
          <a class="button button-primary" href="./planner.html?new=1">Start with YatraAI</a>
          <a class="button button-secondary" href="./chat.html">Open AI Chat</a>
          <a class="button button-secondary" href="./events.html">See Major Events</a>
        </div>
        <div class="hero-meta">
          <div><span>Curated places</span><strong>30 destination picks</strong></div>
          <div><span>Planning modes</span><strong>Air, road, train and mapped routes</strong></div>
          <div><span>Saved journeys</span><strong>Trip and chat history included</strong></div>
        </div>
      </div>
      <aside class="planner-card">
        <p class="eyebrow">Thinking about a trip?</p>
        <h2>Start with a fast trip brief.</h2>
        <form id="quickPlanner" class="quick-planner">
          <label>Destination<input id="destinationInput" type="text" placeholder="Pune, Goa, Jaipur, Ladakh"></label>
          <div class="quick-grid">
            <label>Days<input id="daysInput" type="number" min="1" max="21" value="3"></label>
            <label>Budget<input id="budgetInput" type="number" min="1000" step="500" value="6000"></label>
          </div>
          <label>Interests<div class="chip-row" id="homeInterestChips"></div></label>
          <button class="button button-primary button-full" type="submit">Open Planner with this trip</button>
        </form>
      </aside>
      <div class="hero-pagination" id="homeHeroPagination"></div>
    </section>
    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Travel styles</p>
          <h2>Browse India like an editorial travel site</h2>
        </div>
        <p class="section-note">A VisitTheUSA-style homepage flow, while keeping your original YatraAI dark theme and trip tools.</p>
      </div>
      <div class="quick-links-grid">
        ${spotlightPlaces.map((name, index) => miniPlaceCard(name, index === 0 ? "wide" : "")).join("")}
      </div>
    </section>
    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Feature routes</p>
          <h2>Start with ready-made journey ideas</h2>
        </div>
        <a class="inline-link" href="./planner.html">Build your own route</a>
      </div>
      <div class="route-spotlight-grid">
        ${featuredRoutes.map((route, index) => routeSpotlightCard(route, index)).join("")}
      </div>
    </section>
    <section class="section story-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">YatraAI pages</p>
          <h2>Move from search to planning</h2>
        </div>
      </div>
      <div class="feature-grid">
        <a class="feature-card" href="./destinations.html"><h3>Browse destinations</h3><p>Explore 30 famous Indian places with official tourism links.</p></a>
        <a class="feature-card" href="./planner.html"><h3>Mapped trip planner</h3><p>Choose air, road or train and see the route visualized on a map.</p></a>
        <a class="feature-card" href="./chat.html"><h3>Trip-aware AI chat</h3><p>Keep separate conversations and ask questions around your saved plans.</p></a>
        <a class="feature-card" href="./history.html"><h3>Saved history</h3><p>Return to past trips and plan fresh routes without losing them.</p></a>
      </div>
    </section>
    <section class="section editorial-grid-shell">
      <div class="section-head">
        <div>
          <p class="eyebrow">Destination stories</p>
          <h2>Pick a mood, then open the right tool</h2>
        </div>
      </div>
      <div class="editorial-grid">
        <div class="editorial-lead">
          ${miniPlaceCard(editorialPlaces[0], "tall")}
        </div>
        <div class="editorial-stack">
          ${miniPlaceCard(editorialPlaces[1])}
          ${miniPlaceCard(editorialPlaces[2])}
        </div>
        <div class="editorial-actions">
          ${inspirationCard("Destination library", "Filter all 30 places by region and search by state, mood or travel idea.", "./destinations.html", "Browse")}
          ${inspirationCard("Events calendar", "See the top major festivals and culture-led travel moments across India.", "./events.html", "Attend")}
          ${inspirationCard("Explorer mode", "Compare nearby places, access details and regional pairings before you commit to a route.", "./explorer.html", "Discover")}
          ${inspirationCard("Live India map", "Scan every featured place on a single map before building a route.", "./map.html", "Visualize")}
        </div>
      </div>
    </section>
  `;
}

function destinationsPage() {
  return `
    <section class="page-hero"><p class="eyebrow">30 iconic places</p><h1>India destination library</h1><p>Use this page like a visual shortlist before you move into planning mode.</p></section>
    <section class="section filter-bar">
      <input id="destinationSearch" type="text" placeholder="Search a place, state or region">
      <select id="regionFilter"><option value="All">All regions</option>${[...new Set(destinationPlaces.map((p) => p.region))].map((r) => `<option value="${r}">${r}</option>`).join("")}</select>
    </section>
    <section class="section"><div class="destination-grid" id="allDestinations"></div></section>
  `;
}

function plannerPage() {
  return `
    <section class="page-hero"><p class="eyebrow">YatraAI planner</p><h1>Plan a trip from your own inputs</h1><p>Write where you are starting from, where you want to go, how you want to travel, where you want to stay and what you want to visit nearby.</p></section>
    <section class="section planner-layout single-top">
      <div class="ai-console">
        <form id="plannerForm" class="quick-planner">
          <div class="quick-grid triple">
            <label>Start from<input id="startCity" type="text" placeholder="Mumbai"></label>
            <label>Destination<input id="plannerDestination" list="placeSuggestions" type="text" placeholder="Jaipur, Goa, Pune, Leh"></label>
            <label>Travel mode<select id="travelMode"><option value="Air">By air</option><option value="Road">By road</option><option value="Train">By train</option></select></label>
          </div>
          <div class="quick-grid triple">
            <label>Days<input id="tripDays" type="number" min="1" max="21" value="4"></label>
            <label>Budget<input id="tripBudget" type="number" min="1000" step="500" value="12000"></label>
            <label>Stay preference<input id="stayPreference" type="text" placeholder="budget hotel, resort, hostel, family stay"></label>
          </div>
          <div class="quick-grid triple">
            <label>Travel vibe<input id="travelVibe" type="text" placeholder="relaxed, luxury, adventure"></label>
            <label>Nearby focus<input id="nearbyFocus" type="text" placeholder="cafes, forts, temples, shopping"></label>
            <label>Places to visit<input id="visitFocus" type="text" placeholder="heritage, food streets, museums"></label>
          </div>
          <label>Interests<div class="chip-row" id="plannerInterests"></div></label>
          <div class="hero-actions planner-actions">
            <button class="button button-primary" type="submit">Generate Route</button>
            <button class="button button-secondary" type="button" id="startNewTrip">Start New Trip</button>
          </div>
        </form>
        <datalist id="placeSuggestions">${destinationPlaces.map((p) => `<option value="${p.name}"></option>`).join("")}</datalist>
      </div>
      <aside class="planner-sidebar"><article class="sidebar-card"><p class="eyebrow">YatraAI route memory</p><h3>Start fresh without losing old plans</h3><p>When you start a new trip, the current one is moved into history automatically.</p><p class="route-note">The route map uses OpenStreetMap with free routing and turn-by-turn steps for the current trip.</p></article></aside>
    </section>
    <section class="section">
      <div class="planner-map-wrap"><div id="plannerMap" class="planner-map"></div></div>
      <div class="map-link-bar" id="plannerMapLinks"></div>
      <div class="route-output" id="routeOutput"></div>
      <div class="navigation-steps" id="navigationSteps"></div>
    </section>
  `;
}

function chatPage() {
  return `
    <section class="page-hero"><p class="eyebrow">YatraAI chat</p><h1>Trip-aware conversations</h1><p>Start a new chat, switch between old chats and ask questions using your current planned trip as context.</p></section>
    <section class="section chat-layout">
      <aside class="chat-sidebar">
        <button class="button button-primary button-full" id="newChatButton" type="button">New Chat</button>
        <div class="chat-session-list" id="chatSessionList"></div>
      </aside>
      <div class="ai-console chat-console chat-console-wide">
        <div class="console-header">
          <div><strong id="chatSessionTitle">New chat</strong><small id="chatPlanContext">No planned trip linked yet</small></div>
          <a class="status-dot" href="./planner.html">Open Planner</a>
        </div>
        <div class="messages" id="chatMessages"></div>
        <form class="chat-form" id="dedicatedChatForm">
          <textarea id="dedicatedChatInput" rows="3" placeholder="Ask about your route, destination, nearby places, transport or trip ideas"></textarea>
          <button class="button button-primary" type="submit">Send</button>
        </form>
      </div>
    </section>
  `;
}

function explorerPage() {
  return `
    <section class="page-hero"><p class="eyebrow">Explorer</p><h1>Nearby picks and place overviews</h1><p>Pick any featured place and see a curated summary, access notes and nearby route ideas.</p></section>
    <section class="section planner-layout single-top">
      <div class="ai-console">
        <form class="quick-planner" id="explorerSearchForm">
          <div class="quick-grid">
            <label>Write place name<input id="explorerPlaceInput" list="explorerPlaceSuggestions" type="text" placeholder="Jaipur, Goa, Varanasi, Munnar"></label>
            <label>Interest focus<select id="explorerInterest">${interestOptions.map((i) => `<option value="${i}">${i}</option>`).join("")}</select></label>
          </div>
          <div class="hero-actions planner-actions">
            <button class="button button-primary" type="submit">Explore Place</button>
            <button class="button button-secondary" type="button" id="explorerUseCurrentTrip">Use Current Trip Place</button>
          </div>
          <datalist id="explorerPlaceSuggestions">${destinationPlaces.map((p) => `<option value="${p.name}"></option>`).join("")}</datalist>
        </form>
      </div>
      <aside class="planner-sidebar">
        <article class="sidebar-card">
          <p class="eyebrow">Explorer tips</p>
          <h3>Type a place instead of selecting</h3>
          <p>Search with city names from your destination library, then YatraAI will show a deeper overview, access notes and nearby route pairings.</p>
        </article>
      </aside>
    </section>
    <section class="section explorer-grid explorer-grid-detailed"><article class="sidebar-card explorer-overview-card" id="overviewCard"></article><article class="sidebar-card" id="accessCard"></article><article class="sidebar-card" id="nearbyCard"></article></section>
  `;
}

function mapPage() {
  return `<section class="page-hero"><p class="eyebrow">YatraAI map</p><h1>30 featured places, marked</h1><p>Use the map to scan where each destination sits before planning a route.</p></section><section class="section"><div id="indiaMap" class="map-shell"></div><div class="map-link-bar"><a class="button button-secondary" href="https://www.google.com/maps/search/?api=1&query=India+tourist+destinations" target="_blank" rel="noreferrer">Open all destinations in Google Maps</a></div></section>`;
}

function historyPage() {
  return `<section class="page-hero"><p class="eyebrow">Saved plans</p><h1>Trip history</h1><p>Every time you start a new trip, the current plan is saved here.</p></section><section class="section"><div class="history-list" id="historyList"></div></section>`;
}

function eventsPage() {
  return `
    <section class="page-hero"><p class="eyebrow">Top 10 major events</p><h1>Festival and event calendar</h1><p>Use this page to discover India's biggest culture, faith and seasonal travel events before you build your itinerary.</p></section>
    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Major moments</p>
          <h2>Plan around crowd-pulling events</h2>
        </div>
        <a class="inline-link" href="./planner.html">Turn an event into a trip</a>
      </div>
      <div class="event-grid" id="eventsGrid"></div>
    </section>
  `;
}

function pageMarkup() {
  if (page === "destinations") return destinationsPage();
  if (page === "events") return eventsPage();
  if (page === "planner") return plannerPage();
  if (page === "chat") return chatPage();
  if (page === "explorer") return explorerPage();
  if (page === "map") return mapPage();
  if (page === "history") return historyPage();
  return homePage();
}

function renderPage() {
  const shellClass = page === "home" ? "page-shell full-bleed-shell" : page === "chat" ? "page-shell chat-shell" : "page-shell";
  document.body.innerHTML = nav() + `<main class="${shellClass}">${pageMarkup()}</main>` + footer();
}

function planContextText() {
  const plan = getPlan();
  if (!plan) return "No current trip saved.";
  return `Current trip: ${plan.start} to ${plan.place.name} by ${plan.mode}, ${plan.days} days, budget Rs.${plan.budget}, vibe ${plan.vibe}, interests ${plan.interests.join(", ")}.`;
}

function demoResponse(prompt) {
  const tripHint = getPlan() ? `\n\nCurrent trip context: ${getPlan().start} to ${getPlan().place.name} by ${getPlan().mode}.` : "";
  const text = prompt.toLowerCase();
  if (text.includes("how to go") || text.includes("transport")) return `Transport guide\n\nTrain: budget-friendly and comfortable on popular routes.\nBus: good value for direct intercity travel.\nCab: best for flexibility and scenic stops.\nBest pick: choose train for savings, cab or self-drive for convenience.${tripHint}`;
  if (text.includes("near")) return `Nearby picks\n\nStart with one landmark and let YatraAI surface attractions, cafes and quick stops around it. Then group them into morning, afternoon and dinner clusters.${tripHint}`;
  if (text.includes("tell me about") || text.includes("overview")) return `Place overview\n\nThis spot works as both a sightseeing stop and a mood-setter for the trip. Expect a clear description, practical details and a tip on the best time to visit once your backend is connected.${tripHint}`;
  return `Trip sketch\n\nDay 1: arrival, landmark visit, local cafe and evening market.\nDay 2: culture-heavy route with a scenic midday break and destination dining.\nDay 3: nearby exploration or road-trip extension depending on your budget.\n\nWhy it fits: this route balances discovery, food and visual highlights while keeping the pace practical.${tripHint}`;
}

function yatraAiDataNote() {
  return "YatraAI should use your own places, stays, routes, nearby picks and planning data as the source of truth, with Ollama handling local inference for trip planning and chat.";
}

async function queryBackend(prompt) {
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
      blurb: place.blurb,
    })),
  };
  const response = await fetch(API_CONFIG.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: API_CONFIG.model,
      prompt: [
        "You are YatraAI, an India travel planner.",
        "Use only the supplied travel data as the primary source of truth.",
        "Give practical trip planning advice with concise structure.",
        `Travel data: ${JSON.stringify(context)}`,
        `User request: ${prompt}`,
      ].join("\n\n"),
      stream: false,
    }),
  });
  if (!response.ok) throw new Error("Backend request failed");
  const payload = await response.json();
  return payload.response || payload.reply || payload.message || demoResponse(prompt);
}

function paintInterestChips(holder, selected) {
  holder.innerHTML = interestOptions.map((i) => `<button type="button" class="interest-chip ${selected.has(i) ? "active" : ""}" data-interest="${i}">${i}</button>`).join("");
  holder.querySelectorAll(".interest-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const value = chip.dataset.interest;
      if (selected.has(value)) selected.delete(value); else selected.add(value);
      paintInterestChips(holder, selected);
    });
  });
}

function initHome() {
  const selected = new Set(["Food", "Culture"]);
  const holder = document.getElementById("homeInterestChips");
  const form = document.getElementById("quickPlanner");
  const media = document.getElementById("homeHeroMedia");
  const title = document.getElementById("homeHeroTitle");
  const copy = document.getElementById("homeHeroCopy");
  const pager = document.getElementById("homeHeroPagination");
  let index = 0;

  const renderSlide = (i) => {
    const slide = HOME_SLIDES[i];
    media.style.backgroundImage = `url('${slide[2]}')`;
    title.textContent = slide[0];
    copy.textContent = slide[1];
    pager.innerHTML = HOME_SLIDES.map((_, idx) => `<button class="hero-dot ${idx === i ? "active" : ""}" data-index="${idx}" aria-label="Show tourism image ${idx + 1}"></button>`).join("");
    pager.querySelectorAll(".hero-dot").forEach((dot) => dot.addEventListener("click", () => { index = Number(dot.dataset.index); renderSlide(index); }));
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const place = getPlace(document.getElementById("destinationInput").value.trim() || "Pune");
    setPlan({
      id: Date.now(),
      start: "Your city",
      place,
      mode: "Road",
      days: document.getElementById("daysInput").value || "3",
      budget: document.getElementById("budgetInput").value || "6000",
      stayPreference: "comfortable hotel",
      vibe: "balanced",
      nearbyFocus: "nearby highlights",
      visitFocus: place.highlights.join(", "),
      interests: Array.from(selected),
      workflow: buildWorkflow("Road", "Your city", place),
      createdAt: new Date().toLocaleString(),
    });
    window.location.href = "./planner.html";
  });

  paintInterestChips(holder, selected);
  renderSlide(index);
  setInterval(() => { index = (index + 1) % HOME_SLIDES.length; renderSlide(index); }, 5500);
}

function initDestinations() {
  const grid = document.getElementById("allDestinations");
  const search = document.getElementById("destinationSearch");
  const region = document.getElementById("regionFilter");
  const paint = () => {
    const term = search.value.trim().toLowerCase();
    const reg = region.value;
    grid.innerHTML = destinationPlaces.filter((p) => {
      const matchTerm = !term || `${p.name} ${p.state} ${p.region}`.toLowerCase().includes(term);
      return matchTerm && (reg === "All" || p.region === reg);
    }).map(placeCard).join("");
  };
  search.addEventListener("input", paint);
  region.addEventListener("change", paint);
  paint();
}

function initEvents() {
  const grid = document.getElementById("eventsGrid");
  grid.innerHTML = majorEvents.map((event, index) => eventCard(event, index)).join("");
}

function buildWorkflow(mode, start, place) {
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

function getStaySuggestion(plan) {
  const pref = (plan.stayPreference || "").toLowerCase();
  if (pref.includes("hostel")) return `Focus on hostel and low-cost stay options near ${plan.place.name}'s main transit area.`;
  if (pref.includes("resort")) return `Look for resort-style stays around scenic or quieter parts of ${plan.place.name}.`;
  if (pref.includes("family")) return `Choose family-friendly stays near safe, central and easy-access areas in ${plan.place.name}.`;
  return `Choose a ${plan.stayPreference || "comfortable"} stay near the main highlights of ${plan.place.name}.`;
}

async function geocodePlace(query) {
  const known = destinationPlaces.find((p) => p.name.toLowerCase() === String(query).toLowerCase());
  if (known) return [known.lat, known.lng, known.name];
  if (CITY_COORDS[query]) return [CITY_COORDS[query][0], CITY_COORDS[query][1], query];

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error("Geocoding failed");
  const data = await response.json();
  const item = data && data[0];
  if (!item) return findCoords(query);
  return [Number(item.lat), Number(item.lon), item.display_name];
}

async function fetchRouteGeometry(plan) {
  const start = await geocodePlace(plan.start);
  const end = [plan.place.lat, plan.place.lng, plan.place.name];
  const profile = plan.mode === "Road" ? "driving" : plan.mode === "Train" ? "driving" : "driving";
  const coords = `${start[1]},${start[0]};${end[1]},${end[0]}`;
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Routing failed");
  const data = await response.json();
  const route = data.routes && data.routes[0];
  return {
    start,
    end,
    route: route ? route.geometry.coordinates : [[start[1], start[0]], [end[1], end[0]]],
    distanceKm: route ? (route.distance / 1000).toFixed(1) : null,
    durationMin: route ? Math.round(route.duration / 60) : null,
    steps: route ? route.legs.flatMap((leg) => leg.steps || []) : [],
  };
}

async function drawPlannerMap(plan) {
  if (typeof L === "undefined") return;
  const routeData = await fetchRouteGeometry(plan);
  if (!plannerMap) {
    plannerMap = L.map("plannerMap", { zoomControl: true }).setView([routeData.start[0], routeData.start[1]], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(plannerMap);
  }

  if (plannerRouteLayer) plannerRouteLayer.remove();
  plannerRouteLayer = L.layerGroup().addTo(plannerMap);
  L.marker([routeData.start[0], routeData.start[1]]).addTo(plannerRouteLayer).bindPopup(`Start: ${routeData.start[2]}`);
  L.marker([routeData.end[0], routeData.end[1]]).addTo(plannerRouteLayer).bindPopup(`Destination: ${routeData.end[2]}`);
  const latLngs = routeData.route.map((coord) => [coord[1], coord[0]]);
  L.polyline(latLngs, { color: "#f3c76b", weight: 5, opacity: 0.9 }).addTo(plannerRouteLayer);
  plannerMap.fitBounds(latLngs, { padding: [40, 40] });
  plan.routeMeta = routeData;
}

function renderPlan(plan) {
  document.getElementById("routeOutput").innerHTML = `
    <article class="route-card hero-route"><p class="eyebrow">${plan.mode} trip</p><h2>${plan.start} to ${plan.place.name}</h2><p>${plan.place.blurb}</p></article>
    <div class="route-grid">
      <article class="route-card"><span>01</span><h3>Trip setup</h3><p>${plan.days} days - Budget Rs.${plan.budget} - Stay: ${plan.stayPreference || "flexible"} - Vibe: ${plan.vibe}</p></article>
      <article class="route-card"><span>02</span><h3>Travel access</h3><p>Air: ${plan.place.airport}<br>Train: ${plan.place.rail}<br>Road: ${plan.place.road}</p></article>
      <article class="route-card"><span>03</span><h3>Stay and nearby plan</h3><p>${getStaySuggestion(plan)} Nearby focus: ${plan.nearbyFocus || "local highlights"}.</p></article>
      <article class="route-card"><span>04</span><h3>Places to visit</h3><p>${plan.visitFocus || plan.place.highlights.join(", ")}</p></article>
      <article class="route-card"><span>05</span><h3>YatraAI data policy</h3><p>${yatraAiDataNote()}</p></article>
      <article class="route-card"><span>06</span><h3>Route summary</h3><p id="routeMetaText">${plan.routeMeta && plan.routeMeta.distanceKm ? `${plan.routeMeta.distanceKm} km - ${plan.routeMeta.durationMin} min estimated drive time` : "Route summary will appear here after map routing loads."}</p></article>
    </div>
    <article class="workflow-card"><p class="eyebrow">Workflow</p><h3>How this trip flows</h3><div class="workflow-list">${plan.workflow.map((step, idx) => `<div class="workflow-item"><strong>${idx + 1}</strong><p>${step}</p></div>`).join("")}</div></article>
  `;
  const mapLinks = document.getElementById("plannerMapLinks");
  if (mapLinks) {
    mapLinks.innerHTML = `
      <a class="button button-secondary" href="${buildGoogleMapsDirectionsLink(plan)}" target="_blank" rel="noreferrer">Open route in Google Maps</a>
      <a class="button button-secondary" href="${buildGoogleMapsPlaceLink(plan.place)}" target="_blank" rel="noreferrer">Open destination in Google Maps</a>
    `;
  }
  drawPlannerMap(plan).then(() => {
    if (plan.routeMeta && plan.routeMeta.distanceKm) {
      const meta = document.getElementById("routeMetaText");
      if (meta) meta.textContent = `${plan.routeMeta.distanceKm} km - ${plan.routeMeta.durationMin} min estimated route time`;
      const nav = document.getElementById("navigationSteps");
      if (nav) {
        const steps = (plan.routeMeta.steps || []).slice(0, 12);
        nav.innerHTML = `
          <article class="workflow-card">
            <p class="eyebrow">Navigation</p>
            <h3>Turn-by-turn route guidance</h3>
            <div class="step-list">
              ${steps.length ? steps.map((step, index) => `<div class="step-item"><strong>${index + 1}</strong><p>${step.maneuver.instruction || step.name || "Continue on the route"}</p><small>${step.distance ? `${(step.distance / 1000).toFixed(1)} km` : ""}</small></div>`).join("") : `<div class="step-item"><p>Navigation steps are not available for this route.</p></div>`}
            </div>
          </article>
        `;
      }
    }
  }).catch(() => {
    const meta = document.getElementById("routeMetaText");
    if (meta) meta.textContent = "Route lookup could not be completed.";
    const nav = document.getElementById("navigationSteps");
    if (nav) nav.innerHTML = `<article class="workflow-card"><p class="eyebrow">Navigation</p><h3>Route guidance unavailable</h3><p>We could not load turn-by-turn steps for this route.</p></article>`;
  });
}

function initPlanner() {
  const selected = new Set(["Culture", "Food"]);
  const form = document.getElementById("plannerForm");
  const holder = document.getElementById("plannerInterests");
  const params = new URLSearchParams(window.location.search);
  paintInterestChips(holder, selected);

  const capturePlan = () => {
    const place = getPlace(document.getElementById("plannerDestination").value.trim() || "Pune");
    const mode = document.getElementById("travelMode").value;
    const start = document.getElementById("startCity").value.trim() || "Your city";
    return {
      id: Date.now(),
      start,
      place,
      mode,
      days: document.getElementById("tripDays").value,
      budget: document.getElementById("tripBudget").value,
      stayPreference: document.getElementById("stayPreference").value.trim() || "comfortable hotel",
      vibe: document.getElementById("travelVibe").value.trim() || "balanced",
      nearbyFocus: document.getElementById("nearbyFocus").value.trim() || "nearby highlights",
      visitFocus: document.getElementById("visitFocus").value.trim() || place.highlights.join(", "),
      interests: Array.from(selected),
      workflow: buildWorkflow(mode, start, place),
      createdAt: new Date().toLocaleString(),
    };
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const plan = capturePlan();
    setPlan(plan);
    renderPlan(plan);
  });

  document.getElementById("startNewTrip").addEventListener("click", () => {
    archiveCurrentPlan();
    form.reset();
    document.getElementById("tripDays").value = 4;
    document.getElementById("tripBudget").value = 12000;
    document.getElementById("routeOutput").innerHTML = `<article class="route-card empty-state"><p class="eyebrow">New trip started</p><h3>Your previous plan was saved to history</h3><p>Pick a destination, mode and interests to generate a fresh route.</p></article>`;
    const mapLinks = document.getElementById("plannerMapLinks");
    if (mapLinks) mapLinks.innerHTML = "";
    if (plannerRouteLayer) { plannerRouteLayer.remove(); plannerRouteLayer = null; }
  });

  if (params.get("new") === "1") {
    archiveCurrentPlan();
    document.getElementById("routeOutput").innerHTML = `<article class="route-card empty-state"><p class="eyebrow">New trip started</p><h3>Your previous plan was saved to history</h3><p>Pick a destination, mode and interests to generate a fresh route.</p></article>`;
    const mapLinks = document.getElementById("plannerMapLinks");
    if (mapLinks) mapLinks.innerHTML = "";
  } else if (getPlan()) {
    renderPlan(getPlan());
  } else {
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  }
}

function activeChat() {
  const sessions = getChats();
  const current = sessions.find((s) => s.id === getChatId());
  return current || sessions[0] || null;
}

function createChat() {
  const sessions = getChats();
  const session = {
    id: uid("chat"),
    title: "New chat",
    updatedAt: new Date().toLocaleString(),
    messages: [{ role: "assistant", content: "Tell me where you want to go. I can use your current planned trip as context when one is available." }],
  };
  sessions.unshift(session);
  setChats(sessions.slice(0, 40));
  setChatId(session.id);
  return session;
}

function updateChat(id, updater) {
  const sessions = getChats().map((session) => {
    if (session.id !== id) return session;
    const next = updater({ ...session, messages: [...session.messages] });
    next.updatedAt = new Date().toLocaleString();
    return next;
  });
  setChats(sessions);
}

function renderChatList() {
  const holder = document.getElementById("chatSessionList");
  const currentId = getChatId();
  holder.innerHTML = getChats().map((session) => `
    <button class="chat-session-item ${session.id === currentId ? "active" : ""}" data-id="${session.id}" type="button">
      <strong>${session.title}</strong>
      <small>${session.updatedAt}</small>
    </button>
  `).join("");
  holder.querySelectorAll(".chat-session-item").forEach((item) => {
    item.addEventListener("click", () => {
      setChatId(item.dataset.id);
      renderChatUi();
    });
  });
}

function renderChatUi() {
  const session = activeChat();
  document.getElementById("chatSessionTitle").textContent = session.title;
  document.getElementById("chatPlanContext").textContent = planContextText();
  document.getElementById("chatMessages").innerHTML = session.messages.map((msg) => `
    <article class="message ${msg.role === "assistant" ? "assistant" : "user"}">
      <span class="role">${msg.role === "assistant" ? "YatraAI" : "Traveler"}</span>
      <p>${msg.content}</p>
    </article>
  `).join("");
  renderChatList();
}

function initChat() {
  if (!activeChat()) createChat();
  document.getElementById("newChatButton").addEventListener("click", () => { createChat(); renderChatUi(); });
  document.getElementById("dedicatedChatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("dedicatedChatInput");
    const prompt = input.value.trim();
    if (!prompt) return;
    input.value = "";
    const session = activeChat();
    updateChat(session.id, (current) => {
      current.messages.push({ role: "user", content: prompt });
      if (current.title === "New chat") current.title = prompt.slice(0, 40);
      return current;
    });
    renderChatUi();
    let reply;
    try { reply = await queryBackend(`${planContextText()}\n\nUser question: ${prompt}`); }
    catch { reply = `${demoResponse(prompt)}\n\nThe live backend endpoint is not connected yet, so this is a demo response.`; }
    updateChat(session.id, (current) => { current.messages.push({ role: "assistant", content: reply }); return current; });
    renderChatUi();
  });
  renderChatUi();
}

function initExplorer() {
  const searchForm = document.getElementById("explorerSearchForm");
  const placeInput = document.getElementById("explorerPlaceInput");
  const interestSelect = document.getElementById("explorerInterest");
  const overview = document.getElementById("overviewCard");
  const access = document.getElementById("accessCard");
  const nearby = document.getElementById("nearbyCard");
  const resolvePlace = () => {
    const raw = (placeInput.value || "").trim().toLowerCase();
    return destinationPlaces.find((item) => item.name.toLowerCase() === raw) ||
      destinationPlaces.find((item) => item.name.toLowerCase().includes(raw)) ||
      destinationPlaces.find((item) => item.state.toLowerCase().includes(raw)) ||
      getPlan()?.place ||
      destinationPlaces[0];
  };
  const paint = () => {
    const place = resolvePlace();
    placeInput.value = place.name;
    const related = destinationPlaces.filter((item) => item.region === place.region && item.name !== place.name).slice(0, 4);
    const currentInterest = interestSelect.value;
    overview.innerHTML = `
      <div class="explorer-overview-media" style="background-image:url('${place.image}')"></div>
      <div class="explorer-overview-copy">
        <p class="eyebrow">Detailed overview</p>
        <h3>${place.name}</h3>
        <p>${place.blurb}</p>
        <div class="meta">${place.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        <div class="explorer-detail-list">
          <div><strong>State</strong><span>${place.state}</span></div>
          <div><strong>Region</strong><span>${place.region}</span></div>
          <div><strong>Best fit</strong><span>${currentInterest} travelers, short getaways and destination-led planning</span></div>
          <div><strong>Must-see highlights</strong><span>${place.highlights.join(", ")}</span></div>
        </div>
        <p>This place works well when you want a ${place.tags.slice(0, 2).join(" and ").toLowerCase()} trip rhythm, with strong visual anchors and enough nearby options to extend the route.</p>
        <div class="hero-actions">
          <a class="button button-secondary" href="${place.officialUrl}" target="_blank" rel="noreferrer">Official tourism page</a>
          <a class="button button-secondary" href="${buildGoogleMapsPlaceLink(place)}" target="_blank" rel="noreferrer">Open in Google Maps</a>
        </div>
      </div>
    `;
    access.innerHTML = `
      <p class="eyebrow">Access by mode</p>
      <h3>${place.name} logistics</h3>
      <p>Use this breakdown to decide whether the destination works better as a weekend trip, a longer stop or part of a regional circuit.</p>
      <ul>
        <li>Air access: ${place.airport}</li>
        <li>Rail access: ${place.rail}</li>
        <li>Road access: ${place.road}</li>
        <li>Interest match: ${currentInterest}</li>
        <li>Planning note: best paired with a stay near ${place.highlights[0]} or the main city core.</li>
      </ul>
    `;
    nearby.innerHTML = `
      <p class="eyebrow">Nearby style picks</p>
      <h3>${place.region} circuit</h3>
      <p>${related.map((item) => item.name).join(", ")} pair well with ${place.name} for a broader route.</p>
      <ul>${related.map((item) => `<li><strong>${item.name}</strong>: ${item.blurb} Highlights: ${item.highlights.join(", ")}.</li>`).join("")}</ul>
    `;
  };
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    paint();
  });
  document.getElementById("explorerUseCurrentTrip").addEventListener("click", () => {
    const current = getPlan();
    if (current?.place?.name) placeInput.value = current.place.name;
    paint();
  });
  placeInput.addEventListener("change", paint);
  interestSelect.addEventListener("change", paint);
  placeInput.value = getPlan()?.place?.name || destinationPlaces[0].name;
  paint();
}

function initMap() {
  if (typeof L === "undefined") return;
  const map = L.map("indiaMap", { zoomControl: true }).setView([22.5, 79.5], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  destinationPlaces.forEach((place) => {
    L.circleMarker([place.lat, place.lng], {
      radius: 6,
      color: "#f3c76b",
      weight: 2,
      fillColor: "#c8942e",
      fillOpacity: 0.9,
    }).addTo(map).bindPopup(`<strong>${place.name}</strong><br>${place.state}<br><a href="${place.officialUrl}" target="_blank" rel="noreferrer">Official tourism page</a>`);
  });
}

function initHistory() {
  const current = getPlan();
  const history = getPlanHistory();
  document.getElementById("historyList").innerHTML =
    (current ? `<article class="route-card"><p class="eyebrow">Current trip</p><h3>${current.start} to ${current.place.name}</h3><p>${current.mode} - ${current.days} days - Rs.${current.budget}</p><p>Saved at ${current.createdAt}</p></article>` : "") +
    (history.length
      ? history.map((item) => `<article class="route-card"><p class="eyebrow">Saved trip</p><h3>${item.start} to ${item.place.name}</h3><p>${item.mode} - ${item.days} days - Rs.${item.budget}</p><p>${item.interests.join(", ")}</p><p>Saved at ${item.createdAt}</p></article>`).join("")
      : `<article class="route-card empty-state"><p class="eyebrow">No saved trips yet</p><h3>Your history will appear here</h3><p>Generate a plan, then tap Start New Trip to archive it here.</p></article>`);
}

renderPage();
if (page === "home") initHome();
if (page === "destinations") initDestinations();
if (page === "events") initEvents();
if (page === "planner") initPlanner();
if (page === "chat") initChat();
if (page === "explorer") initExplorer();
if (page === "map") initMap();
if (page === "history") initHistory();

