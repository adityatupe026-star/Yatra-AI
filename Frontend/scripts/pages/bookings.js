import { destinationPlaces } from "../data/site-data.js";
import { getPlan } from "../core/state.js";
import {
  buildPackageOptions,
  buildPriceRangeSummary,
  buildFlightOptions,
  buildFareCalendar,
  buildBusOptions,
  buildTrainOptions,
  buildTrainAvailabilityCalendar,
  buildCarOptions,
  buildExperienceOptions,
  evaluatePnr,
} from "../utils/booking-data.js";
import { debounce, escapeHtml, formatCurrency } from "../utils/helpers.js";
import { getTravelRecommendations } from "../utils/recommendations.js";
import { queryBackend, renderChatBody } from "../utils/ai.js";
import { confirmBooking, summarizeHotelBooking } from "../utils/bookings-api.js";
import { buildGoogleMapsPlaceLink } from "../utils/travel.js";
import { showToast } from "../components/toast.js";

const BOOKING_TRIPS_KEY = "yatraai.bookingTrips";
const BOOKING_STATE_KEY = "yatraai.bookingHubState";
const MODULES = [
  ["flights", "Flights"],
  ["hotels", "Hotels"],
  ["buses", "Buses"],
  ["trains", "Trains"],
  ["cars", "Cabs"],
  ["packages", "Packages"],
  ["experiences", "Experiences"],
  ["myra", "Myra"],
];

const PROPERTY_TYPES = ["Hotel", "Resort", "Villa", "Hostel", "Homestay", "Service Apartment", "Heritage Haveli"];
const HOTEL_AMENITIES = ["pool", "gym", "spa", "wifi", "parking", "breakfast included", "pet-friendly"];
const MEAL_OPTIONS = ["Veg", "Non-veg", "Jain", "Child meal", "Diabetic"];
const FLIGHT_STOP_OPTIONS = ["Any", "Non-stop", "1 stop", "2+ stops"];
const FLIGHT_SLOT_OPTIONS = ["Any", "Early morning", "Daytime", "Evening", "Night"];
const TRAIN_CLASSES = ["SL", "3AC", "2AC", "1AC", "CC", "EC"];
const TRAIN_QUOTAS = ["General", "Ladies", "Senior Citizen", "Defence", "Foreign Tourist"];
const EXPERIENCE_FILTERS = ["All", "Adventure", "Culture", "Food", "Wellness", "Wildlife", "Sightseeing"];
const PACKAGE_TIER_FILTERS = ["All", "Standard", "Deluxe", "Luxury"];
const CABS = ["Airport transfer", "Outstation", "Local sightseeing", "Self-drive"];

let bookingState = {
  activeModule: "flights",
  savedTrips: [],
  flightResults: [],
  flightCalendar: [],
  flightSelection: null,
  flightSeat: null,
  flightAddonMeals: "Veg",
  flightBaggage: 10,
  flightInsurance: true,
  flightFastTrack: false,
  flightLockDays: 3,
  hotelResults: [],
  hotelSelection: null,
  hotelSummaryCache: {},
  hotelView: "list",
  busResults: [],
  busSelection: null,
  busSeat: null,
  trainResults: [],
  trainSelection: null,
  trainCalendar: [],
  pnrLookup: "",
  cabResults: [],
  cabSelection: null,
  packageResults: [],
  packageSelection: null,
  experienceResults: [],
  experienceSelection: null,
  myraConversation: [],
  lastBooking: null,
  bookingSessionId: "",
};

let hotelLoadToken = 0;
let myraBusy = false;

const loadTrips = () => {
  try {
    return JSON.parse(localStorage.getItem(BOOKING_TRIPS_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveTrips = (trips) => {
  localStorage.setItem(BOOKING_TRIPS_KEY, JSON.stringify(trips));
  bookingState.savedTrips = trips;
};

const persistState = () => {
  try {
    localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify({
      activeModule: bookingState.activeModule,
      flightSelection: bookingState.flightSelection,
      flightSeat: bookingState.flightSeat,
      flightAddonMeals: bookingState.flightAddonMeals,
      flightBaggage: bookingState.flightBaggage,
      flightInsurance: bookingState.flightInsurance,
      flightFastTrack: bookingState.flightFastTrack,
      flightLockDays: bookingState.flightLockDays,
      hotelSelection: bookingState.hotelSelection,
      hotelView: bookingState.hotelView,
      busSelection: bookingState.busSelection,
      busSeat: bookingState.busSeat,
      trainSelection: bookingState.trainSelection,
      trainCalendar: bookingState.trainCalendar,
      pnrLookup: bookingState.pnrLookup,
      cabSelection: bookingState.cabSelection,
      packageSelection: bookingState.packageSelection,
      experienceSelection: bookingState.experienceSelection,
      lastBooking: bookingState.lastBooking,
      bookingSessionId: bookingState.bookingSessionId,
    }));
  } catch {
    /* ignore storage issues */
  }
};

const hashText = (value) => {
  let hash = 0;
  for (let i = 0; i < String(value || "").length; i += 1) {
    hash = ((hash << 5) - hash) + String(value)[i].charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
};

const createBookingSessionId = () => `book_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const currentPlanDestination = () => getPlan()?.place?.name || destinationPlaces[0].name;

const getDestination = (name) => destinationPlaces.find((place) => place.name.toLowerCase() === String(name || "").toLowerCase())
  || destinationPlaces.find((place) => String(name || "").toLowerCase().includes(place.name.toLowerCase()))
  || destinationPlaces[0];

function setActiveModule(module) {
  bookingState.activeModule = module;
  document.querySelectorAll("[data-booking-module]").forEach((section) => {
    section.classList.toggle("is-active", section.dataset.bookingModule === module);
  });
  document.querySelectorAll("[data-booking-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.bookingTab === module);
  });
  document.getElementById(`${module}Module`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  persistState();
}

function renderShellStat(label, value) {
  return `<div class="booking-stat"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`;
}

function renderModuleTabs() {
  const holder = document.getElementById("bookingModuleTabs");
  if (!holder) return;
  holder.innerHTML = MODULES.map(([key, label]) => `<button class="booking-tab ${bookingState.activeModule === key ? "active" : ""}" type="button" data-booking-tab="${key}">${label}</button>`).join("");
  holder.querySelectorAll("[data-booking-tab]").forEach((button) => {
    button.addEventListener("click", () => setActiveModule(button.dataset.bookingTab));
  });
}

function renderSavedTrips() {
  const holder = document.getElementById("savedTripsList");
  if (!holder) return;
  const trips = loadTrips();
  bookingState.savedTrips = trips;
  holder.innerHTML = trips.length
    ? trips.slice(0, 6).map((trip) => {
      const title = escapeHtml(trip.label || "Saved booking");
      const summary = escapeHtml(trip.summary || "No extra summary stored.");
      const reference = trip.reference ? `<span class="saved-trip-chip">Ref ${escapeHtml(trip.reference)}</span>` : "";
      const moduleLabel = escapeHtml(String(trip.module || "booking"));
      const createdAt = escapeHtml(trip.createdAt || "");
      const detailLine = trip.details?.seat || trip.details?.flight?.flightNo || trip.details?.hotel?.name || trip.details?.experience?.category || trip.details?.cab?.carType || trip.details?.pkg?.name || "";
      return `
        <article class="saved-trip-card">
          <div class="saved-trip-card-top">
            <div>
              <p class="saved-trip-eyebrow">${moduleLabel}</p>
              <strong>${title}</strong>
            </div>
            ${reference}
          </div>
          <p>${summary}</p>
          ${detailLine ? `<div class="saved-trip-route">${escapeHtml(String(detailLine))}</div>` : ""}
          <div class="saved-trip-footer">
            <span>${createdAt}</span>
          </div>
        </article>
      `;
    }).join("")
    : `<article class="saved-trip-card empty"><strong>No saved bookings yet</strong><p>Select any booking result and save it here.</p><div class="saved-trip-footer"><span>Your saved flights, hotels and activities will show up here.</span></div></article>`;
  const count = document.getElementById("savedTripsCount");
  if (count) count.textContent = String(trips.length);
}

function renderModuleStatus() {
  const holder = document.getElementById("bookingModuleStatus");
  if (!holder) return;
  const counts = [
    ["Flights", bookingState.flightResults.length],
    ["Hotels", bookingState.hotelResults.length],
    ["Buses", bookingState.busResults.length],
    ["Trains", bookingState.trainResults.length],
    ["Packages", bookingState.packageResults.length],
    ["Experiences", bookingState.experienceResults.length],
  ];
  holder.innerHTML = counts.map(([label, value]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function buildSeatGrid(prefix, rows, cols) {
  const seats = [];
  for (let row = 1; row <= rows; row += 1) {
    cols.forEach((col, index) => {
      seats.push({
        id: `${prefix}${row}${col}`,
        label: `${row}${col}`,
        occupied: (hashText(prefix + row + col) % 5) === 0,
        extra: row <= 2,
        kind: index === 0 || index === cols.length - 1 ? "Window" : index === 1 || index === cols.length - 2 ? "Aisle" : "Middle",
      });
    });
  }
  return seats;
}

async function saveCurrentSelection(module, label, summary, details = {}) {
  try {
    if (!bookingState.bookingSessionId) {
      bookingState.bookingSessionId = createBookingSessionId();
    }
    const confirmation = await confirmBooking({
      module,
      label,
      summary,
      price: Number(details.price || 0),
      details,
      sessionId: bookingState.bookingSessionId,
      page: "bookings",
    });
    const trips = loadTrips();
    const entry = {
      id: Date.now(),
      module,
      label,
      summary: confirmation.summary || summary,
      reference: confirmation.reference || "",
      createdAt: new Date().toLocaleString(),
      details,
    };
    trips.unshift(entry);
    saveTrips(trips.slice(0, 18));
    bookingState.lastBooking = {
      reference: confirmation.reference || "",
      label,
      module,
      summary: confirmation.summary || summary,
      createdAt: confirmation.created_at || new Date().toISOString(),
      sessionId: bookingState.bookingSessionId,
    };
    renderSavedTrips();
    renderBookingHeroContext();
    persistState();
    showToast(`${label} confirmed${confirmation.reference ? ` • ${confirmation.reference}` : ""}.`, "success");
    return confirmation;
  } catch (error) {
    showToast(error?.message || `Could not save ${label.toLowerCase()}.`, "warning");
    return null;
  }
}

function flightCard(flight) {
  const selected = bookingState.flightSelection?.id === flight.id;
  return `
    <article class="booking-result-card ${selected ? "is-selected" : ""}">
      <div class="booking-result-head">
        <div>
          <p class="eyebrow">${escapeHtml(flight.airline)}</p>
          <h3>${escapeHtml(flight.flightNo)}</h3>
        </div>
        <strong>${formatCurrency(flight.price)}</strong>
      </div>
      <div class="booking-result-meta">
        <div><span>Depart</span><strong>${escapeHtml(flight.depart)}</strong></div>
        <div><span>Arrive</span><strong>${escapeHtml(flight.arrive)}</strong></div>
        <div><span>Stops</span><strong>${escapeHtml(flight.stops)}</strong></div>
        <div><span>Duration</span><strong>${escapeHtml(flight.durationLabel)}</strong></div>
      </div>
      <p>${escapeHtml(flight.why)}</p>
      <div class="meta booking-tags"><span>${escapeHtml(flight.cabin)}</span><span>${escapeHtml(flight.meal)}</span><span>${escapeHtml(flight.baggage)}</span></div>
      <button class="button button-secondary booking-select-button" type="button" data-select-flight="${escapeHtml(flight.id)}">Select flight</button>
    </article>
  `;
}

function hotelPropertyType(item) {
  const type = String(item.stayType || item.subcategory || "hotel").toLowerCase();
  if (type.includes("resort")) return "Resort";
  if (type.includes("hostel")) return "Hostel";
  if (type.includes("guest")) return "Homestay";
  if (type.includes("apartment")) return "Service Apartment";
  if (type.includes("inn")) return "Heritage Haveli";
  return "Hotel";
}

function hotelStarScore(item) {
  return Math.min(5, Math.max(1, Math.round((item.rating || 7) / 2)));
}

function annotateHotel(item, destination) {
  const seed = hashText(`${item.id}-${destination.name}`);
  const amenities = [...new Set([
    HOTEL_AMENITIES[seed % HOTEL_AMENITIES.length],
    HOTEL_AMENITIES[(seed + 2) % HOTEL_AMENITIES.length],
    HOTEL_AMENITIES[(seed + 4) % HOTEL_AMENITIES.length],
  ])];
  const basePrice = item.budget === "luxury" ? 8600 : item.budget === "mid-range" ? 4200 : 2100;
  const pricePerNight = Math.round(basePrice + (seed % 950));
  return {
    ...item,
    propertyType: hotelPropertyType(item),
    stars: hotelStarScore(item),
    amenities,
    freeCancellation: seed % 3 !== 0,
    instantConfirmation: seed % 4 !== 0,
    mmtSelect: item.rating >= 8 && item.reviews >= 100,
    pricePerNight,
    mapLink: buildGoogleMapsPlaceLink({ name: item.name, state: destination.state }),
    gallery: [
      destination.image,
      "https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg?auto=compress&cs=tinysrgb&w=1200",
      "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1200",
    ],
    roomTypes: [
      { name: "Standard room", price: pricePerNight, note: "Best for short stays." },
      { name: "Deluxe room", price: Math.round(pricePerNight * 1.25), note: "More space and stronger comfort." },
      { name: "Family suite", price: Math.round(pricePerNight * 1.55), note: "Best for families and longer stays." },
    ],
    neighbourhoodGuide: [
      `${destination.name} rail and metro access`,
      `${destination.name} market and food lanes`,
      `${destination.name} hospital and pharmacy cluster`,
    ],
    verifiedPhotos: `${Math.max(2, 6 - (seed % 3))} verified`,
    travellerPhotos: `${Math.max(1, 3 + (seed % 4))} traveller`,
    distanceLabel: `${Number(item.distanceKm || 0).toFixed(1)} km from city center`,
  };
}

function hotelCard(hotel) {
  const selected = bookingState.hotelSelection?.id === hotel.id;
  return `
    <article class="booking-result-card hotel-card ${selected ? "is-selected" : ""}">
      <div class="booking-result-head">
        <div>
          <p class="eyebrow">${escapeHtml(hotel.propertyType)} ${hotel.mmtSelect ? "MMT Select" : ""}</p>
          <h3>${escapeHtml(hotel.name)}</h3>
        </div>
        <strong>${formatCurrency(hotel.pricePerNight)}</strong>
      </div>
      <div class="booking-result-meta">
        <div><span>Stars</span><strong>${escapeHtml(String(hotel.stars))}</strong></div>
        <div><span>Reviews</span><strong>${escapeHtml(String(hotel.reviews))}</strong></div>
        <div><span>Distance</span><strong>${escapeHtml(hotel.distanceLabel)}</strong></div>
        <div><span>Cancellation</span><strong>${hotel.freeCancellation ? "Free" : "Paid"}</strong></div>
      </div>
      <div class="meta booking-tags">${hotel.amenities.slice(0, 4).map((amenity) => `<span>${escapeHtml(amenity)}</span>`).join("")}</div>
      <p>${escapeHtml(hotel.why)}</p>
      <button class="button button-secondary booking-select-button" type="button" data-select-hotel="${escapeHtml(hotel.id)}">View detail</button>
    </article>
  `;
}

function buildFlightModuleMarkup() {
  return `
    <div class="section-head"><div><p class="eyebrow">Flights</p><h2>Search flights with filters, fare calendar and seat map</h2></div></div>
    <div class="booking-module-grid">
      <form id="flightSearchForm" class="booking-form">
        <div class="quick-grid triple">
          <label>Origin<input id="flightOrigin" type="text" value="Mumbai"></label>
          <label>Destination<input id="flightDestination" type="text" value="${escapeHtml(currentPlanDestination())}"></label>
          <label>Trip type<select id="flightTripType"><option>One way</option><option>Return</option><option>Multi-city</option></select></label>
        </div>
        <div class="quick-grid triple">
          <label>Travel class<select id="flightClass">${["Economy", "Premium", "Business", "First"].map((value) => `<option>${value}</option>`).join("")}</select></label>
          <label>Passengers<input id="flightPassengers" type="number" min="1" max="6" value="1"></label>
          <label>Budget band<select id="flightBudgetBand"><option value="">Auto</option><option value="budget">Budget</option><option value="mid-range">Mid-range</option><option value="luxury">Luxury</option></select></label>
        </div>
        <div class="quick-grid triple">
          <label>Stops<select id="flightStopsFilter">${FLIGHT_STOP_OPTIONS.map((value) => `<option>${value}</option>`).join("")}</select></label>
          <label>Departure slot<select id="flightSlotFilter">${FLIGHT_SLOT_OPTIONS.map((value) => `<option>${value}</option>`).join("")}</select></label>
          <label>Price lock<select id="flightLockDays"><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option></select></label>
        </div>
        <div class="quick-grid triple">
          <label>Coupon code<input id="flightCoupon" type="text" placeholder="WELCOME100"></label>
          <label>Loyalty points<input id="flightPoints" type="number" min="0" step="50" value="0"></label>
          <label class="booking-check"><input id="flightMultiCity" type="checkbox"> Enable multi-city</label>
        </div>
        <div id="multiCityLegs" class="multi-city-grid hidden-field">
          <label>Leg 1 origin<input id="leg1Origin" type="text" value="Mumbai"></label>
          <label>Leg 1 destination<input id="leg1Destination" type="text" value="Delhi"></label>
          <label>Leg 2 origin<input id="leg2Origin" type="text" value="Delhi"></label>
          <label>Leg 2 destination<input id="leg2Destination" type="text" value="Goa"></label>
          <label>Leg 3 origin<input id="leg3Origin" type="text" value="Goa"></label>
          <label>Leg 3 destination<input id="leg3Destination" type="text" value="Mumbai"></label>
        </div>
      </form>
      <div class="booking-sidebar-stack">
        <article class="sidebar-card">
          <p class="eyebrow">Add-ons</p>
          <h3>Booking extras</h3>
          <label>Meal<select id="flightMealSelect">${MEAL_OPTIONS.map((meal) => `<option>${meal}</option>`).join("")}</select></label>
          <label>Checked baggage<input id="flightBaggage" type="range" min="10" max="25" step="5" value="10"></label>
          <label class="booking-check"><input id="flightInsurance" type="checkbox" checked> Travel insurance</label>
          <label class="booking-check"><input id="flightFastTrack" type="checkbox"> Priority check-in / fast-track security</label>
        </article>
        <article class="sidebar-card">
          <p class="eyebrow">Traveller details</p>
          <h3>Booking flow</h3>
          <label>Name<input id="flightTravellerName" type="text" placeholder="Traveller name"></label>
          <label>Email<input id="flightTravellerEmail" type="email" placeholder="name@example.com"></label>
          <label>Phone<input id="flightTravellerPhone" type="text" placeholder="Phone number"></label>
          <button class="button button-primary" id="flightBookButton" type="button">Book flight</button>
        </article>
      </div>
    </div>
    <div class="booking-results-grid">
      <article class="workflow-card">
        <p class="eyebrow">Search results</p>
        <h3>Flights</h3>
        <div id="flightResults" class="booking-result-list"></div>
      </article>
      <article class="workflow-card">
        <p class="eyebrow">Fare calendar</p>
        <h3>Cheapest day in 30 days</h3>
        <div id="fareCalendar" class="fare-calendar-grid"></div>
      </article>
    </div>
    <div class="booking-results-grid">
      <article class="workflow-card">
        <p class="eyebrow">Seat map</p>
        <h3>Choose your seat</h3>
        <div id="flightSeatMap"></div>
      </article>
      <article class="workflow-card">
        <p class="eyebrow">Price lock</p>
        <h3>Freeze fare while deciding</h3>
        <div class="booking-summary-list">
          <div><strong>${formatCurrency(147)}</strong><span>3 day lock</span></div>
          <div><strong>${formatCurrency(245)}</strong><span>5 day lock</span></div>
          <div><strong>${formatCurrency(343)}</strong><span>7 day lock</span></div>
          <div><strong>Fare protection</strong><span>Locks the current offer window</span></div>
        </div>
      </article>
    </div>
    <div id="flightBookingSummary"></div>
  `;
}

function buildHotelModuleMarkup() {
  const interests = ["Family", "Couple", "Friends", "Solo", "Luxury", "Budget"];
  return `
    <div class="section-head"><div><p class="eyebrow">Hotels</p><h2>Search stays, switch between list and map view, and open a detail page</h2></div></div>
    <div class="booking-module-grid">
      <form id="hotelSearchForm" class="booking-form">
        <div class="quick-grid triple">
          <label>City or area<input id="hotelCity" type="text" value="${escapeHtml(currentPlanDestination())}"></label>
          <label>Check-in<input id="hotelCheckIn" type="date"></label>
          <label>Check-out<input id="hotelCheckOut" type="date"></label>
        </div>
        <div class="quick-grid triple">
          <label>Rooms<input id="hotelRooms" type="number" min="1" max="6" value="1"></label>
          <label>Adults<input id="hotelAdults" type="number" min="1" max="8" value="2"></label>
          <label>Children<input id="hotelChildren" type="number" min="0" max="6" value="0"></label>
        </div>
        <div class="quick-grid triple">
          <label>Stay preference<input id="hotelStayPreference" type="text" placeholder="family, resort, hostel, business"></label>
          <label>Budget band<select id="hotelBudgetBand"><option value="">Auto</option><option value="budget">Budget</option><option value="mid-range">Mid-range</option><option value="luxury">Luxury</option></select></label>
          <label>View<select id="hotelViewMode"><option value="list">List</option><option value="map">Map</option></select></label>
        </div>
        <div class="booking-chip-row" id="hotelInterests"></div>
      </form>
      <div class="booking-sidebar-stack">
        <article class="sidebar-card">
          <p class="eyebrow">Filters</p>
          <h3>Property controls</h3>
          <label>Star rating<select id="hotelStarFilter"><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option><option value="5">5</option></select></label>
          <label>Max price/night<input id="hotelPriceFilter" type="number" min="1000" step="500" value="15000"></label>
          <label>Property type<select id="hotelPropertyFilter"><option value="All">All</option>${PROPERTY_TYPES.map((type) => `<option>${type}</option>`).join("")}</select></label>
          <label>Amenity<select id="hotelAmenityFilter"><option value="All">All</option>${HOTEL_AMENITIES.map((amenity) => `<option>${amenity}</option>`).join("")}</select></label>
          <label>Distance from center<input id="hotelDistanceFilter" type="range" min="1" max="60" value="30"></label>
          <label class="booking-check"><input id="hotelFreeCancel" type="checkbox"> Free cancellation only</label>
        </article>
        <article class="sidebar-card">
          <p class="eyebrow">Booking perks</p>
          <h3>Hotel promises</h3>
          <ul>
            <li>Instant confirmation when available</li>
            <li>MMT Select style badge for strong properties</li>
            <li>Price match guarantee concept built into the page</li>
            <li>Alternative stays like villas and heritage havelis included</li>
          </ul>
        </article>
      </div>
    </div>
    <div class="hero-actions">
      <button class="button button-secondary" type="button" id="hotelListView">List view</button>
      <button class="button button-secondary" type="button" id="hotelMapToggle">Map view</button>
      <button class="button button-secondary" type="button" id="hotelRefreshSummary">Refresh AI review summary</button>
    </div>
    <div class="booking-results-grid hotel-results-grid">
      <article class="workflow-card">
        <p class="eyebrow">Properties</p>
        <h3>Stay options</h3>
        <div id="hotelResults" class="booking-result-list"></div>
        <div id="hotelMapView" class="hidden-field"></div>
      </article>
      <article class="workflow-card">
        <p class="eyebrow">Hotel detail page</p>
        <h3>Selected property</h3>
        <div id="hotelDetail"></div>
      </article>
    </div>
    <div class="booking-chip-row hidden-field" id="hotelInterestSeed">${interests.map((item) => `<span class="chip">${item}</span>`).join("")}</div>
  `;
}

function renderFlightSeatMap() {
  const holder = document.getElementById("flightSeatMap");
  if (!holder) return;
  const flight = bookingState.flightSelection;
  if (!flight) {
    holder.innerHTML = `<article class="booking-empty">Select a flight to view the seat map.</article>`;
    return;
  }
  const seats = buildSeatGrid("F", 6, ["A", "B", "C", "D", "E", "F"]);
  holder.innerHTML = `<div class="seat-map-grid">${seats.map((seat) => `<button type="button" class="seat ${seat.occupied ? "occupied" : ""} ${bookingState.flightSeat?.id === seat.id ? "selected" : ""} ${seat.extra ? "extra-legroom" : ""}" data-seat-id="${escapeHtml(seat.id)}" ${seat.occupied ? "disabled" : ""}><strong>${escapeHtml(seat.label)}</strong><span>${seat.extra ? "Extra leg room" : seat.kind}</span></button>`).join("")}</div>`;
  holder.querySelectorAll("[data-seat-id]").forEach((button) => {
    button.addEventListener("click", () => {
      bookingState.flightSeat = seats.find((seat) => seat.id === button.dataset.seatId) || null;
      renderFlightSeatMap();
      renderFlightBookingSummary();
      persistState();
    });
  });
}

function renderFlightBookingSummary() {
  const holder = document.getElementById("flightBookingSummary");
  if (!holder) return;
  const flight = bookingState.flightSelection;
  if (!flight) {
    holder.innerHTML = `<article class="booking-summary-card">Select a flight to build the booking flow.</article>`;
    return;
  }
  const seatFee = bookingState.flightSeat?.extra ? 850 : 0;
  const mealFee = bookingState.flightAddonMeals === "Jain" ? 120 : bookingState.flightAddonMeals === "Diabetic" ? 150 : bookingState.flightAddonMeals === "Child meal" ? 180 : 0;
  const baggageFee = Math.max(0, Number(bookingState.flightBaggage || 10) - 10) * 110;
  const insuranceFee = bookingState.flightInsurance ? 249 : 0;
  const fastTrackFee = bookingState.flightFastTrack ? 199 : 0;
  const lockFee = bookingState.flightLockDays * 49;
  const coupon = (document.getElementById("flightCoupon")?.value || "").trim().toUpperCase();
  const loyaltyPoints = Number(document.getElementById("flightPoints")?.value || 0);
  const couponDiscount = coupon === "WELCOME100" ? 100 : coupon === "SAVE250" ? 250 : 0;
  const loyaltyDiscount = Math.min(700, Math.floor(loyaltyPoints / 10));
  const total = Math.max(0, flight.price + seatFee + mealFee + baggageFee + insuranceFee + fastTrackFee + lockFee - couponDiscount - loyaltyDiscount);
  holder.innerHTML = `
    <article class="booking-summary-card">
      <p class="eyebrow">Flight booking flow</p>
      <h3>${escapeHtml(flight.airline)} ${escapeHtml(flight.flightNo)}</h3>
      <div class="booking-summary-list">
        <div><strong>${formatCurrency(flight.price)}</strong><span>Base fare</span></div>
        <div><strong>${bookingState.flightSeat ? bookingState.flightSeat.label : "Auto"}</strong><span>Seat</span></div>
        <div><strong>${bookingState.flightAddonMeals}</strong><span>Meal</span></div>
        <div><strong>${bookingState.flightLockDays} days</strong><span>Price lock</span></div>
      </div>
      ${bookingState.multiCitySummary ? `<p class="route-note">${escapeHtml(bookingState.multiCitySummary)}</p>` : ""}
      <div class="booking-summary-list">
        <div><strong>${coupon || "None"}</strong><span>Coupon</span></div>
        <div><strong>${loyaltyPoints}</strong><span>Loyalty points</span></div>
        <div><strong>${formatCurrency(couponDiscount + loyaltyDiscount)}</strong><span>Discounts</span></div>
        <div><strong>${flight.meal}</strong><span>Included meal</span></div>
      </div>
      <div class="booking-summary-total"><strong>${formatCurrency(total)}</strong><span>Total with selected add-ons</span></div>
    </article>
  `;
}

async function refreshFlights() {
  const multiCityEnabled = document.getElementById("flightMultiCity")?.checked || document.getElementById("flightTripType")?.value === "Multi-city";
  const origin = multiCityEnabled ? document.getElementById("leg1Origin")?.value?.trim() || "Mumbai" : document.getElementById("flightOrigin")?.value?.trim() || "Mumbai";
  const destination = multiCityEnabled ? document.getElementById("leg1Destination")?.value?.trim() || currentPlanDestination() : document.getElementById("flightDestination")?.value?.trim() || currentPlanDestination();
  const classType = document.getElementById("flightClass")?.value || "Economy";
  const passengers = Number(document.getElementById("flightPassengers")?.value || 1);
  const tripType = document.getElementById("flightTripType")?.value || "One way";
  const budget = document.getElementById("flightBudgetBand")?.value || "";
  const maxStops = document.getElementById("flightStopsFilter")?.value || "Any";
  const departureSlot = document.getElementById("flightSlotFilter")?.value || "Any";
  bookingState.multiCitySummary = "";
  bookingState.flightResults = buildFlightOptions({ origin, destination, classType, passengers, tripType, budget, maxStops, departureSlot });
  if (multiCityEnabled) {
    const legs = [
      [document.getElementById("leg1Origin")?.value, document.getElementById("leg1Destination")?.value],
      [document.getElementById("leg2Origin")?.value, document.getElementById("leg2Destination")?.value],
      [document.getElementById("leg3Origin")?.value, document.getElementById("leg3Destination")?.value],
    ].filter(([from, to]) => from?.trim() && to?.trim());
    const summaries = legs.map(([from, to]) => buildFlightOptions({ origin: from.trim(), destination: to.trim(), classType, passengers, tripType: "One way", budget, maxStops, departureSlot })[0]).filter(Boolean);
    bookingState.multiCitySummary = summaries.length ? `Multi-city route: ${summaries.map((item) => `${item.airline} ${item.flightNo} ${item.depart}→${item.arrive}`).join(" | ")}` : "";
  }
  bookingState.flightCalendar = buildFareCalendar(bookingState.flightResults);
  if (!bookingState.flightSelection || !bookingState.flightResults.some((flight) => flight.id === bookingState.flightSelection.id)) {
    bookingState.flightSelection = bookingState.flightResults[0] || null;
    bookingState.flightSeat = bookingState.flightSelection ? buildSeatGrid("F", 6, ["A", "B", "C", "D", "E", "F"]).find((seat) => !seat.occupied) || null : null;
  }
  const results = document.getElementById("flightResults");
  const calendar = document.getElementById("fareCalendar");
  if (results) results.innerHTML = bookingState.flightResults.map(flightCard).join("");
  if (calendar) {
    calendar.innerHTML = bookingState.flightCalendar.map((day) => `<article class="fare-day ${day.isCheapest ? "is-cheapest" : ""}"><strong>${escapeHtml(day.label)}</strong><span>${escapeHtml(day.dayName)}</span><p>${formatCurrency(day.price)}</p></article>`).join("");
  }
  results?.querySelectorAll("[data-select-flight]").forEach((button) => {
    button.addEventListener("click", () => {
      bookingState.flightSelection = bookingState.flightResults.find((flight) => flight.id === button.dataset.selectFlight) || null;
      bookingState.flightSeat = bookingState.flightSelection ? buildSeatGrid("F", 6, ["A", "B", "C", "D", "E", "F"]).find((seat) => !seat.occupied) || null : null;
      renderFlightSeatMap();
      renderFlightBookingSummary();
      refreshFlights();
      persistState();
      showToast("Flight selected.", "success");
    });
  });
  renderFlightSeatMap();
  renderFlightBookingSummary();
  renderModuleStatus();
  persistState();
}

function renderHotels(viewMode = "list") {
  const results = document.getElementById("hotelResults");
  const map = document.getElementById("hotelMapView");
  if (!results || !map) return;
  bookingState.hotelView = viewMode;
  results.classList.toggle("hidden-field", viewMode === "map");
  map.classList.toggle("hidden-field", viewMode !== "map");
  results.innerHTML = bookingState.hotelResults.map(hotelCard).join("");
  map.innerHTML = bookingState.hotelSelection
    ? `<article class="booking-map-card"><p class="eyebrow">Map view</p><h3>${escapeHtml(bookingState.hotelSelection.name)}</h3><p>${escapeHtml(bookingState.hotelSelection.distanceLabel)}</p><a class="button button-secondary" href="${bookingState.hotelSelection.mapLink}" target="_blank" rel="noreferrer">Open in Google Maps</a></article>`
    : `<article class="booking-empty">Select a hotel to show the map view.</article>`;
  results.querySelectorAll("[data-select-hotel]").forEach((button) => {
    button.addEventListener("click", async () => {
      bookingState.hotelSelection = bookingState.hotelResults.find((hotel) => hotel.id === button.dataset.selectHotel) || null;
      await renderHotelDetail();
      renderHotels(bookingState.hotelView);
      persistState();
      showToast("Hotel selected.", "success");
    });
  });
}

async function renderHotelDetail() {
  const holder = document.getElementById("hotelDetail");
  if (!holder) return;
  const hotel = bookingState.hotelSelection;
  if (!hotel) {
    holder.innerHTML = `<article class="booking-summary-card">Select a hotel to see the detail page.</article>`;
    return;
  }
  if (!bookingState.hotelSummaryCache[hotel.id]) {
    bookingState.hotelSummaryCache[hotel.id] = await summarizeHotelBooking(hotel, hotel.destination || currentPlanDestination()).catch((error) => error?.message || "Hotel summary unavailable from backend.");
  }
  const summaryHtml = renderChatBody(bookingState.hotelSummaryCache[hotel.id], "assistant");
  holder.innerHTML = `
    <article class="booking-detail-card">
      <p class="eyebrow">Hotel detail page</p>
      <h3>${escapeHtml(hotel.name)}</h3>
      <div class="booking-gallery">
        ${hotel.gallery.map((src, index) => `<figure><img src="${src}" alt="${escapeHtml(hotel.name)} photo ${index + 1}"><figcaption>${index === 0 ? "Verified photo" : "Traveller photo"}</figcaption></figure>`).join("")}
      </div>
      <div class="booking-detail-grid">
        <div class="booking-detail-box"><strong>Room types</strong><span>${hotel.roomTypes.map((room) => `${room.name} - ${formatCurrency(room.price)}`).join(" | ")}</span></div>
        <div class="booking-detail-box"><strong>Neighbourhood guide</strong><span>${hotel.neighbourhoodGuide.join(" | ")}</span></div>
        <div class="booking-detail-box"><strong>Cancellation</strong><span>${hotel.freeCancellation ? "Free cancellation available" : "Refundable with fee"}</span></div>
        <div class="booking-detail-box"><strong>Instant confirmation</strong><span>${hotel.instantConfirmation ? "Usually instant" : "24 hour confirmation window"}</span></div>
      </div>
      <div class="booking-ai-summary">${summaryHtml}</div>
      <div class="hero-actions">
        <button class="button button-primary" type="button" id="saveHotelTrip">Save hotel trip</button>
        <a class="button button-secondary" href="${hotel.mapLink}" target="_blank" rel="noreferrer">Open maps</a>
      </div>
    </article>
  `;
  document.getElementById("saveHotelTrip")?.addEventListener("click", () => {
    saveCurrentSelection(
      "hotels",
      `Hotel: ${hotel.name}`,
      `${hotel.propertyType}, ${hotel.stars} stars, ${formatCurrency(hotel.pricePerNight)}`,
      { price: hotel.pricePerNight, hotel },
    );
  });
}

async function refreshHotels() {
  const destination = document.getElementById("hotelCity")?.value?.trim() || currentPlanDestination();
  const stayPreference = document.getElementById("hotelStayPreference")?.value?.trim() || "";
  const budget = document.getElementById("hotelBudgetBand")?.value || "";
  const interests = Array.from(document.querySelectorAll("#hotelInterests .chip.active")).map((chip) => chip.dataset.value);
  const filters = {
    stars: Number(document.getElementById("hotelStarFilter")?.value || 1),
    maxPrice: Number(document.getElementById("hotelPriceFilter")?.value || 100000),
    propertyType: document.getElementById("hotelPropertyFilter")?.value || "All",
    amenity: document.getElementById("hotelAmenityFilter")?.value || "All",
    distanceMax: Number(document.getElementById("hotelDistanceFilter")?.value || 100),
    freeCancellation: document.getElementById("hotelFreeCancel")?.checked || false,
  };
  const token = ++hotelLoadToken;
  const rec = await getTravelRecommendations({ destination, stayPreference, budget, interests });
  if (token !== hotelLoadToken) return;
  const destinationRecord = getDestination(destination);
  bookingState.hotelResults = rec.hotels.map((item) => annotateHotel(item, destinationRecord)).filter((item) => {
    const starOk = item.stars >= filters.stars;
    const priceOk = item.pricePerNight <= filters.maxPrice;
    const propertyOk = filters.propertyType === "All" || item.propertyType === filters.propertyType;
    const amenityOk = filters.amenity === "All" || item.amenities.includes(filters.amenity);
    const distanceOk = Number(item.distanceKm || 0) <= filters.distanceMax;
    const cancelOk = !filters.freeCancellation || item.freeCancellation;
    return starOk && priceOk && propertyOk && amenityOk && distanceOk && cancelOk;
  });
  if (!bookingState.hotelSelection || !bookingState.hotelResults.some((hotel) => hotel.id === bookingState.hotelSelection.id)) {
    bookingState.hotelSelection = bookingState.hotelResults[0] || null;
  }
  renderHotels(document.getElementById("hotelViewMode")?.value || bookingState.hotelView);
  await renderHotelDetail();
  renderModuleStatus();
  persistState();
}

function busCard(bus) {
  const selected = bookingState.busSelection?.id === bus.id;
  return `
    <article class="booking-result-card ${selected ? "is-selected" : ""}">
      <div class="booking-result-head">
        <div>
          <p class="eyebrow">${escapeHtml(bus.operator)}</p>
          <h3>${escapeHtml(bus.busType)}</h3>
        </div>
        <strong>${formatCurrency(bus.price)}</strong>
      </div>
      <div class="booking-result-meta">
        <div><span>Depart</span><strong>${escapeHtml(bus.departure)}</strong></div>
        <div><span>Arrive</span><strong>${escapeHtml(bus.arrival)}</strong></div>
        <div><span>Seats</span><strong>${escapeHtml(String(bus.seatsLeft))}</strong></div>
        <div><span>Duration</span><strong>${escapeHtml(bus.duration)}</strong></div>
      </div>
      <div class="booking-rating-grid">
        <div><strong>${bus.operatorRating}</strong><span>Operator</span></div>
        <div><strong>${bus.punctuality}</strong><span>Punctuality</span></div>
        <div><strong>${bus.cleanliness}</strong><span>Cleanliness</span></div>
        <div><strong>${bus.driving}</strong><span>Driving</span></div>
      </div>
      <p>${escapeHtml(bus.why)}</p>
      <button class="button button-secondary booking-select-button" type="button" data-select-bus="${escapeHtml(bus.id)}">Select bus</button>
    </article>
  `;
}

function renderBusSeatMap() {
  const holder = document.getElementById("busSeatMap");
  if (!holder) return;
  const bus = bookingState.busSelection;
  if (!bus) {
    holder.innerHTML = `<article class="booking-empty">Select a bus to see the seat map.</article>`;
    return;
  }
  const seats = buildSeatGrid("B", 5, ["L", "R"]);
  holder.innerHTML = `<div class="seat-map-grid bus-grid">${seats.map((seat) => `<button type="button" class="seat ${seat.occupied ? "occupied" : ""} ${bookingState.busSeat?.id === seat.id ? "selected" : ""}" data-bus-seat="${escapeHtml(seat.id)}" ${seat.occupied ? "disabled" : ""}><strong>${escapeHtml(seat.label)}</strong><span>${seat.extra ? "Upper berth" : "Lower berth"}</span></button>`).join("")}</div>`;
  holder.querySelectorAll("[data-bus-seat]").forEach((button) => {
    button.addEventListener("click", () => {
      bookingState.busSeat = seats.find((seat) => seat.id === button.dataset.busSeat) || null;
      renderBusSeatMap();
      renderBusTracking();
      persistState();
    });
  });
}

function renderBusTracking() {
  const holder = document.getElementById("busTracking");
  if (!holder) return;
  if (!bookingState.busSelection) {
    holder.innerHTML = `<article class="booking-summary-card">Live tracking will appear after selecting a bus.</article>`;
    return;
  }
  const progress = Math.max(18, Math.min(88, 35 + (hashText(bookingState.busSelection.id) % 40)));
  holder.innerHTML = `
    <article class="booking-summary-card">
      <p class="eyebrow">Live bus tracking</p>
      <h3>${escapeHtml(bookingState.busSelection.operator)}</h3>
      <div class="progress-bar"><span style="width:${progress}%"></span></div>
      <p>${escapeHtml(bookingState.busSelection.tracking)}</p>
      <div class="booking-summary-list">
        <div><strong>${escapeHtml(bookingState.busBoardingPoint || "Central bus stand")}</strong><span>Boarding</span></div>
        <div><strong>${escapeHtml(bookingState.busDroppingPoint || "City depot")}</strong><span>Dropping</span></div>
        <div><strong>${escapeHtml(bookingState.busTrackingMode || "Live")}</strong><span>Tracking mode</span></div>
        <div><strong>${escapeHtml(bookingState.busSeat?.label || "Auto")}</strong><span>Seat</span></div>
      </div>
      <div class="booking-summary-list">
        <div><strong>${bookingState.busSelection.punctuality}</strong><span>Punctuality</span></div>
        <div><strong>${bookingState.busSelection.cleanliness}</strong><span>Cleanliness</span></div>
        <div><strong>${bookingState.busSelection.staff}</strong><span>Staff</span></div>
        <div><strong>${bookingState.busSelection.driving}</strong><span>Driving</span></div>
      </div>
    </article>
  `;
}

function buildBusModuleMarkup() {
  return `
    <div class="section-head"><div><p class="eyebrow">Bus ticketing</p><h2>Route search, operator filters, live tracking and seat map</h2></div></div>
    <div class="booking-module-grid">
      <form id="busSearchForm" class="booking-form">
        <div class="quick-grid triple">
          <label>Source city<input id="busSource" type="text" value="Mumbai"></label>
          <label>Destination city<input id="busDestination" type="text" value="Goa"></label>
          <label>Travel date<input id="busDate" type="date"></label>
        </div>
        <div class="quick-grid triple">
          <label>Bus type<select id="busTypeFilter"><option value="All">All</option><option value="Sleeper">Sleeper</option><option value="Seater">Seater</option></select></label>
          <label>Operator<select id="busOperatorFilter"><option value="All">All</option><option>Volvo Express</option><option>Intercity Star</option><option>Night Owl</option><option>Pink Line</option><option>State Connect</option></select></label>
          <label>Seat preference<select id="busSeatPreference"><option>Any</option><option>Window</option><option>Aisle</option></select></label>
        </div>
        <div class="quick-grid triple">
          <label>Boarding point<select id="busBoardingPoint"><option>Central bus stand</option><option>Metro station</option><option>Airport junction</option></select></label>
          <label>Dropping point<select id="busDroppingPoint"><option>City depot</option><option>Station circle</option><option>Market stop</option></select></label>
          <label>Tracking mode<select id="busTrackingMode"><option>Live</option><option>SMS</option><option>Both</option></select></label>
        </div>
      </form>
      <article class="sidebar-card">
        <p class="eyebrow">Boarding and drop</p>
        <h3>Stop details</h3>
        <div class="booking-summary-list">
          <div><strong>Boarding</strong><span>GPS pinned stop with landmark</span></div>
          <div><strong>Dropping</strong><span>Mini-map with destination stop</span></div>
          <div><strong>Tracking</strong><span>Live ETA updates after booking</span></div>
          <div><strong>Ratings</strong><span>Punctuality, cleanliness, staff, driving</span></div>
        </div>
      </article>
    </div>
    <div class="booking-results-grid">
      <article class="workflow-card"><p class="eyebrow">Results</p><h3>Buses</h3><div id="busResults" class="booking-result-list"></div></article>
      <article class="workflow-card"><p class="eyebrow">Seat map</p><h3>Choose your berth</h3><div id="busSeatMap"></div></article>
    </div>
    <div id="busTracking"></div>
  `;
}

function refreshBuses() {
  const source = document.getElementById("busSource")?.value?.trim() || "Mumbai";
  const destination = document.getElementById("busDestination")?.value?.trim() || "Goa";
  const buses = buildBusOptions({ source, destination });
  const typeFilter = document.getElementById("busTypeFilter")?.value || "All";
  const operatorFilter = document.getElementById("busOperatorFilter")?.value || "All";
  bookingState.busResults = buses.filter((bus) => (typeFilter === "All" || bus.busType.includes(typeFilter)) && (operatorFilter === "All" || bus.operator === operatorFilter));
  if (!bookingState.busSelection || !bookingState.busResults.some((bus) => bus.id === bookingState.busSelection.id)) {
    bookingState.busSelection = bookingState.busResults[0] || null;
    bookingState.busSeat = bookingState.busSelection ? buildSeatGrid("B", 5, ["L", "R"]).find((seat) => !seat.occupied) || null : null;
  }
  const results = document.getElementById("busResults");
  if (results) results.innerHTML = bookingState.busResults.map(busCard).join("");
  bookingState.busBoardingPoint = document.getElementById("busBoardingPoint")?.value || "Central bus stand";
  bookingState.busDroppingPoint = document.getElementById("busDroppingPoint")?.value || "City depot";
  bookingState.busTrackingMode = document.getElementById("busTrackingMode")?.value || "Live";
  results?.querySelectorAll("[data-select-bus]").forEach((button) => {
    button.addEventListener("click", () => {
      bookingState.busSelection = bookingState.busResults.find((bus) => bus.id === button.dataset.selectBus) || null;
      bookingState.busSeat = bookingState.busSelection ? buildSeatGrid("B", 5, ["L", "R"]).find((seat) => !seat.occupied) || null : null;
      renderBusSeatMap();
      renderBusTracking();
      persistState();
    });
  });
  renderBusSeatMap();
  renderBusTracking();
  renderModuleStatus();
  persistState();
}

function trainCard(train) {
  const selected = bookingState.trainSelection?.id === train.id;
  return `
    <article class="booking-result-card ${selected ? "is-selected" : ""}">
      <div class="booking-result-head">
        <div>
          <p class="eyebrow">Train ${escapeHtml(train.trainNo)}</p>
          <h3>${escapeHtml(train.name)}</h3>
        </div>
        <strong>${formatCurrency(train.price)}</strong>
      </div>
      <div class="booking-result-meta">
        <div><span>Depart</span><strong>${escapeHtml(train.departure)}</strong></div>
        <div><span>Arrive</span><strong>${escapeHtml(train.arrival)}</strong></div>
        <div><span>Status</span><strong>${escapeHtml(train.status)}</strong></div>
        <div><span>Class</span><strong>${escapeHtml(train.classType)}</strong></div>
      </div>
      <p>${escapeHtml(train.routeSummary)}</p>
      <div class="meta booking-tags"><span>${escapeHtml(train.quota)}</span><span>${escapeHtml(train.coachNote)}</span></div>
      <button class="button button-secondary booking-select-button" type="button" data-select-train="${escapeHtml(train.id)}">Select train</button>
    </article>
  `;
}

function renderTrainCalendar() {
  const holder = document.getElementById("trainCalendar");
  if (!holder) return;
  holder.innerHTML = bookingState.trainCalendar.map((day) => `<article class="fare-day train-day ${day.status.toLowerCase()}"><strong>${escapeHtml(day.label)}</strong><span>${escapeHtml(day.status)}</span><p>${day.status === "AVAILABLE" ? `${day.seats} seats` : day.status}</p></article>`).join("");
}

function renderPnrResult() {
  const holder = document.getElementById("pnrResult");
  if (!holder) return;
  const pnr = bookingState.pnrLookup || "";
  if (!pnr.trim()) {
    holder.innerHTML = `<article class="booking-empty">Enter a PNR to see the status, waitlist and confirmation chance.</article>`;
    return;
  }
  const result = evaluatePnr(pnr);
  holder.innerHTML = `
    <article class="booking-summary-card">
      <p class="eyebrow">PNR status</p>
      <h3>${escapeHtml(result.status)}</h3>
      <div class="booking-summary-list">
        <div><strong>${result.waitlistPosition || "-"}</strong><span>WL position</span></div>
        <div><strong>${result.confirmationProbability}%</strong><span>Confidence</span></div>
        <div><strong>${escapeHtml(result.coach)}</strong><span>Coach</span></div>
        <div><strong>${escapeHtml(result.charting)}</strong><span>Charting</span></div>
      </div>
    </article>
  `;
}

function renderAutoUpgradeCard() {
  const holder = document.getElementById("trainUpgradeCard");
  if (!holder) return;
  const train = bookingState.trainSelection;
  if (!train) {
    holder.innerHTML = `<article class="booking-empty">Select a train to see auto-upgrade options.</article>`;
    return;
  }
  holder.innerHTML = `
    <article class="booking-summary-card">
      <p class="eyebrow">Auto-upgrade</p>
      <h3>${train.autoUpgrade ? "Eligible for sleeper to AC upgrade" : "Standard inventory only"}</h3>
      <p>${escapeHtml(train.routeSummary)}</p>
      <div class="booking-summary-list">
        <div><strong>${train.autoUpgrade ? "Yes" : "No"}</strong><span>Eligible</span></div>
        <div><strong>${escapeHtml(bookingState.selectedQuota || train.quota)}</strong><span>Quota</span></div>
        <div><strong>${escapeHtml(train.classType)}</strong><span>Current class</span></div>
        <div><strong>${formatCurrency(Math.round(train.price * 0.18))}</strong><span>Upgrade fee</span></div>
      </div>
    </article>
  `;
}

function buildTrainModuleMarkup() {
  return `
    <div class="section-head"><div><p class="eyebrow">Train ticketing</p><h2>Availability calendar, quota selection, PNR check and auto-upgrade</h2></div></div>
    <div class="booking-module-grid">
      <form id="trainSearchForm" class="booking-form">
        <div class="quick-grid triple">
          <label>Source station<input id="trainSource" type="text" value="Mumbai"></label>
          <label>Destination station<input id="trainDestination" type="text" value="Pune"></label>
          <label>Travel date<input id="trainDate" type="date"></label>
        </div>
        <div class="quick-grid triple">
          <label>Class<select id="trainClass">${TRAIN_CLASSES.map((value) => `<option>${value}</option>`).join("")}</select></label>
          <label>Quota<select id="trainQuota">${TRAIN_QUOTAS.map((value) => `<option>${value}</option>`).join("")}</select></label>
          <label>PNR<input id="trainPnr" type="text" placeholder="Enter PNR"></label>
        </div>
      </form>
      <article class="sidebar-card">
        <p class="eyebrow">Availability legend</p>
        <h3>Calendar bands</h3>
        <div class="booking-summary-list">
          <div><strong>AVAILABLE</strong><span>Green tiles</span></div>
          <div><strong>RAC</strong><span>Yellow tiles</span></div>
          <div><strong>WL</strong><span>Red tiles</span></div>
          <div><strong>Auto-upgrade</strong><span>Optional consent-based upgrade</span></div>
        </div>
      </article>
    </div>
    <div class="booking-results-grid">
      <article class="workflow-card"><p class="eyebrow">Trains</p><h3>Results</h3><div id="trainResults" class="booking-result-list"></div></article>
      <article class="workflow-card"><p class="eyebrow">120-day availability</p><h3>Calendar</h3><div id="trainCalendar" class="fare-calendar-grid train-calendar-grid"></div></article>
    </div>
    <div class="booking-results-grid">
      <article class="workflow-card"><p class="eyebrow">PNR checker</p><h3>Status lookup</h3><div id="pnrResult"></div></article>
      <article class="workflow-card"><p class="eyebrow">Auto-upgrade</p><h3>Sleepers to AC if available</h3><div id="trainUpgradeCard"></div></article>
    </div>
  `;
}

function refreshTrains() {
  const source = document.getElementById("trainSource")?.value?.trim() || "Mumbai";
  const destination = document.getElementById("trainDestination")?.value?.trim() || "Pune";
  const classType = document.getElementById("trainClass")?.value || "3AC";
  bookingState.selectedQuota = document.getElementById("trainQuota")?.value || "General";
  bookingState.trainResults = buildTrainOptions({ source, destination, classType });
  bookingState.trainCalendar = buildTrainAvailabilityCalendar({ classType, routeKey: `${source}-${destination}` });
  if (!bookingState.trainSelection || !bookingState.trainResults.some((train) => train.id === bookingState.trainSelection.id)) {
    bookingState.trainSelection = bookingState.trainResults[0] || null;
  }
  const results = document.getElementById("trainResults");
  if (results) results.innerHTML = bookingState.trainResults.map(trainCard).join("");
  results?.querySelectorAll("[data-select-train]").forEach((button) => {
    button.addEventListener("click", () => {
      bookingState.trainSelection = bookingState.trainResults.find((train) => train.id === button.dataset.selectTrain) || null;
      renderTrainCalendar();
      renderPnrResult();
      renderAutoUpgradeCard();
      persistState();
    });
  });
  renderTrainCalendar();
  renderPnrResult();
  renderAutoUpgradeCard();
  renderModuleStatus();
  persistState();
}

function cabCard(cab) {
  const selected = bookingState.cabSelection?.id === cab.id;
  return `
    <article class="booking-result-card ${selected ? "is-selected" : ""}">
      <div class="booking-result-head">
        <div>
          <p class="eyebrow">${escapeHtml(cab.useCase)}</p>
          <h3>${escapeHtml(cab.carType)}</h3>
        </div>
        <strong>${formatCurrency(cab.price)}</strong>
      </div>
      <div class="booking-result-meta">
        <div><span>Included km</span><strong>${escapeHtml(String(cab.includedKm))}</strong></div>
        <div><span>Per km</span><strong>${escapeHtml(String(cab.perKm))}</strong></div>
        <div><span>Driver</span><strong>${cab.driverAssigned ? "Yes" : "No"}</strong></div>
        <div><span>Fuel</span><strong>${cab.fuelIncluded ? "Included" : "Not included"}</strong></div>
      </div>
      <p>${escapeHtml(cab.note)}</p>
      <button class="button button-secondary booking-select-button" type="button" data-select-cab="${escapeHtml(cab.id)}">Select cab</button>
    </article>
  `;
}

function buildCabModuleMarkup() {
  return `
    <div class="section-head"><div><p class="eyebrow">Car rentals and cabs</p><h2>Airport transfer, outstation, sightseeing and self-drive</h2></div></div>
    <div class="booking-module-grid">
      <form id="cabSearchForm" class="booking-form">
        <div class="quick-grid triple">
          <label>Pickup<input id="cabSource" type="text" value="Mumbai"></label>
          <label>Drop<input id="cabDestination" type="text" value="Goa"></label>
          <label>Use case<select id="cabMode">${CABS.map((item) => `<option>${item}</option>`).join("")}</select></label>
        </div>
        <div class="quick-grid triple">
          <label>Pickup time<input id="cabTime" type="time"></label>
          <label>Hours / days<input id="cabDuration" type="text" placeholder="4h, 8h, 2 days"></label>
          <label>Vehicle type<select id="cabVehicleType"><option>Hatchback</option><option>Sedan</option><option>SUV</option><option>Premium SUV</option></select></label>
        </div>
      </form>
      <article class="sidebar-card">
        <p class="eyebrow">Use cases</p>
        <h3>How cab booking works</h3>
        <div class="booking-summary-list">
          ${CABS.map((label) => `<div><strong>${escapeHtml(label)}</strong><span>Working booking mode</span></div>`).join("")}
        </div>
      </article>
    </div>
    <div class="booking-results-grid">
      <article class="workflow-card"><p class="eyebrow">Options</p><h3>Cabs and self-drive</h3><div id="cabResults" class="booking-result-list"></div></article>
      <article class="workflow-card"><p class="eyebrow">Selected vehicle</p><h3>Fare and driver details</h3><div id="cabDetail"></div></article>
    </div>
  `;
}

function refreshCars() {
  const source = document.getElementById("cabSource")?.value?.trim() || currentPlanDestination();
  const destination = document.getElementById("cabDestination")?.value?.trim() || destinationPlaces[0].name;
  bookingState.cabResults = buildCarOptions({ source, destination });
  if (!bookingState.cabSelection || !bookingState.cabResults.some((cab) => cab.id === bookingState.cabSelection.id)) {
    bookingState.cabSelection = bookingState.cabResults[0] || null;
  }
  const results = document.getElementById("cabResults");
  if (results) results.innerHTML = bookingState.cabResults.map(cabCard).join("");
  results?.querySelectorAll("[data-select-cab]").forEach((button) => {
    button.addEventListener("click", () => {
      bookingState.cabSelection = bookingState.cabResults.find((cab) => cab.id === button.dataset.selectCab) || null;
      renderCabDetail();
      persistState();
    });
  });
  renderCabDetail();
  renderModuleStatus();
  persistState();
}

function renderCabDetail() {
  const holder = document.getElementById("cabDetail");
  if (!holder) return;
  const cab = bookingState.cabSelection;
  if (!cab) {
    holder.innerHTML = `<article class="booking-empty">Choose a cab type to see driver and fare details.</article>`;
    return;
  }
  holder.innerHTML = `
    <article class="booking-summary-card">
      <p class="eyebrow">Cab / rental detail</p>
      <h3>${escapeHtml(cab.carType)} for ${escapeHtml(cab.useCase)}</h3>
      <div class="booking-summary-list">
        <div><strong>${formatCurrency(cab.price)}</strong><span>Fixed fare</span></div>
        <div><strong>${escapeHtml(String(cab.includedKm))}</strong><span>Included km</span></div>
        <div><strong>${cab.driverAssigned ? "Assigned" : "Self-drive"}</strong><span>Handover</span></div>
        <div><strong>${cab.fuelIncluded ? "Yes" : "No"}</strong><span>Fuel</span></div>
      </div>
      <p>${escapeHtml(cab.note)} ${escapeHtml(cab.handover)}</p>
      <button class="button button-primary" type="button" id="saveCabTrip">Save cab option</button>
    </article>
  `;
  document.getElementById("saveCabTrip")?.addEventListener("click", () => {
    saveCurrentSelection(
      "cars",
      `Cab: ${cab.carType}`,
      `${cab.useCase}, ${formatCurrency(cab.price)}, ${cab.driverAssigned ? "driver assigned" : "self-drive"}`,
      { price: cab.price, cab },
    );
  });
}

function packageCard(pkg) {
  const selected = bookingState.packageSelection?.id === pkg.id;
  return `
    <article class="booking-result-card ${selected ? "is-selected" : ""}">
      <div class="booking-result-head">
        <div>
          <p class="eyebrow">${escapeHtml(pkg.tier)}</p>
          <h3>${escapeHtml(pkg.name)}</h3>
        </div>
        <strong>${formatCurrency(pkg.budgetHigh)}</strong>
      </div>
      <div class="booking-result-meta">
        <div><span>Days</span><strong>${escapeHtml(String(pkg.days))}</strong></div>
        <div><span>Transport</span><strong>${escapeHtml(pkg.transport)}</strong></div>
        <div><span>EMI</span><strong>${formatCurrency(pkg.emi)}</strong></div>
        <div><span>Fit</span><strong>${escapeHtml((pkg.bestFor || []).slice(0, 2).join(", "))}</strong></div>
      </div>
      <p>${escapeHtml(pkg.savingsTip)}</p>
      <button class="button button-secondary booking-select-button" type="button" data-select-package="${escapeHtml(pkg.id)}">Select package</button>
    </article>
  `;
}

function buildPackageModuleMarkup() {
  return `
    <div class="section-head"><div><p class="eyebrow">Holiday packages</p><h2>Bundles, day-wise plans and EMI for longer trips</h2></div></div>
    <div class="booking-module-grid">
      <form id="packageSearchForm" class="booking-form">
        <div class="quick-grid triple">
          <label>Destination<input id="packageDestination" type="text" value="${escapeHtml(currentPlanDestination())}"></label>
          <label>Tier<select id="packageTierFilter">${PACKAGE_TIER_FILTERS.map((item) => `<option>${item}</option>`).join("")}</select></label>
          <label>Days hint<input id="packageDaysHint" type="number" min="2" max="14" value="4"></label>
        </div>
        <div class="quick-grid triple">
          <label>Flight timing<select id="packageFlightTiming"><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>
          <label>Visa service<label class="booking-check"><input id="packageVisa" type="checkbox"> Add visa help</label></label>
          <label>Insurance<label class="booking-check"><input id="packageInsurance" type="checkbox" checked> Add insurance</label></label>
        </div>
      </form>
      <article class="sidebar-card">
        <p class="eyebrow">Package customiser</p>
        <h3>Instant recalculation</h3>
        <div class="booking-summary-list">
          <div><strong>Standard</strong><span>3-star + shared transfers</span></div>
          <div><strong>Deluxe</strong><span>4-star + private transfers</span></div>
          <div><strong>Luxury</strong><span>5-star + premium experiences</span></div>
          <div><strong>EMI</strong><span>3 to 24 months supported in the UI</span></div>
        </div>
      </article>
    </div>
    <div class="booking-results-grid">
      <article class="workflow-card"><p class="eyebrow">Packages</p><h3>Bundled itineraries</h3><div id="packageResults" class="booking-result-list"></div></article>
      <article class="workflow-card"><p class="eyebrow">Day-wise itinerary</p><h3>Package detail</h3><div id="packageDetail"></div></article>
    </div>
  `;
}

async function refreshPackages() {
  const destination = document.getElementById("packageDestination")?.value?.trim() || currentPlanDestination();
  const packages = await buildPackageOptions(destination);
  const tierFilter = document.getElementById("packageTierFilter")?.value || "All";
  bookingState.packageResults = packages.filter((pkg) => tierFilter === "All" || pkg.tier === tierFilter);
  if (!bookingState.packageSelection || !bookingState.packageResults.some((pkg) => pkg.id === bookingState.packageSelection.id)) {
    bookingState.packageSelection = bookingState.packageResults[0] || null;
  }
  const results = document.getElementById("packageResults");
  if (results) results.innerHTML = bookingState.packageResults.map(packageCard).join("");
  results?.querySelectorAll("[data-select-package]").forEach((button) => {
    button.addEventListener("click", () => {
      bookingState.packageSelection = bookingState.packageResults.find((pkg) => pkg.id === button.dataset.selectPackage) || null;
      renderPackageDetail();
      persistState();
    });
  });
  renderPackageDetail();
  renderModuleStatus();
  persistState();
}

function renderPackageDetail() {
  const holder = document.getElementById("packageDetail");
  if (!holder) return;
  const pkg = bookingState.packageSelection;
  if (!pkg) {
    holder.innerHTML = `<article class="booking-empty">Select a package to see the day-wise itinerary and EMI calculator.</article>`;
    return;
  }
  holder.innerHTML = `
    <article class="booking-detail-card">
      <p class="eyebrow">Package detail</p>
      <h3>${escapeHtml(pkg.name)}</h3>
      <div class="booking-summary-list">
        <div><strong>${formatCurrency(pkg.budgetLow)}</strong><span>Budget low</span></div>
        <div><strong>${formatCurrency(pkg.budgetHigh)}</strong><span>Budget high</span></div>
        <div><strong>${formatCurrency(pkg.emi)}</strong><span>Monthly EMI</span></div>
        <div><strong>${escapeHtml(pkg.tier)}</strong><span>Tier</span></div>
      </div>
      <div class="booking-itinerary">
        ${pkg.dayPlan.map((day) => `<article><strong>Day ${day.day}</strong><p>${escapeHtml(day.morning)}</p><p>${escapeHtml(day.afternoon)}</p><p>${escapeHtml(day.evening)}</p></article>`).join("")}
      </div>
      <div class="booking-detail-grid">
        <div class="booking-detail-box"><strong>Includes</strong><span>${pkg.includes.join(", ")}</span></div>
        <div class="booking-detail-box"><strong>Excludes</strong><span>${pkg.excludes.join(", ")}</span></div>
        <div class="booking-detail-box"><strong>Best for</strong><span>${(pkg.bestFor || []).join(", ")}</span></div>
        <div class="booking-detail-box"><strong>Season note</strong><span>${escapeHtml(pkg.note)}</span></div>
      </div>
      <button class="button button-primary" type="button" id="savePackageTrip">Save package</button>
    </article>
  `;
  document.getElementById("savePackageTrip")?.addEventListener("click", () => {
    saveCurrentSelection(
      "packages",
      `Package: ${pkg.name}`,
      `${pkg.tier}, ${formatCurrency(pkg.budgetHigh)}, EMI ${formatCurrency(pkg.emi)}`,
      { price: pkg.budgetHigh, pkg },
    );
  });
}

function experienceCard(item) {
  const selected = bookingState.experienceSelection?.id === item.id;
  return `
    <article class="booking-result-card ${selected ? "is-selected" : ""}">
      <div class="booking-result-head">
        <div>
          <p class="eyebrow">${escapeHtml(item.category)}</p>
          <h3>${escapeHtml(item.tag)}</h3>
        </div>
        <strong>${formatCurrency(item.pricePerPerson)}</strong>
      </div>
      <div class="booking-result-meta">
        <div><span>Duration</span><strong>${escapeHtml(String(item.durationHours))}h</strong></div>
        <div><span>Meeting point</span><strong>${escapeHtml(item.meetingPoint)}</strong></div>
        <div><span>Confirmation</span><strong>${escapeHtml(item.confirmationType)}</strong></div>
        <div><span>Min group</span><strong>${escapeHtml(String(item.minGroupSize))}</strong></div>
      </div>
      <p>${escapeHtml(item.why)}</p>
      <button class="button button-secondary booking-select-button" type="button" data-select-experience="${escapeHtml(item.id)}">Select experience</button>
    </article>
  `;
}

function buildExperienceModuleMarkup() {
  return `
    <div class="section-head"><div><p class="eyebrow">My experiences</p><h2>Activities, tours, adventure and wellness</h2></div></div>
    <div class="booking-module-grid">
      <form id="experienceSearchForm" class="booking-form">
        <div class="quick-grid triple">
          <label>Destination<input id="experienceDestination" type="text" value="${escapeHtml(currentPlanDestination())}"></label>
          <label>Category<select id="experienceFilter">${EXPERIENCE_FILTERS.map((item) => `<option>${item}</option>`).join("")}</select></label>
          <label>Group size<input id="experienceGroupSize" type="number" min="1" max="20" value="2"></label>
        </div>
      </form>
      <article class="sidebar-card">
        <p class="eyebrow">Booking model</p>
        <h3>Standalone or add-on</h3>
        <div class="booking-summary-list">
          <div><strong>Instant confirmed</strong><span>QR voucher immediately</span></div>
          <div><strong>On-arrival</strong><span>Ground operator confirms in 2-4 hours</span></div>
          <div><strong>Meeting point</strong><span>GPS pinned location</span></div>
          <div><strong>Minimum group</strong><span>Some experiences need 4+</span></div>
        </div>
      </article>
    </div>
    <div class="booking-results-grid">
      <article class="workflow-card"><p class="eyebrow">Experiences</p><h3>Activity listings</h3><div id="experienceResults" class="booking-result-list"></div></article>
      <article class="workflow-card"><p class="eyebrow">Selected experience</p><h3>Details and slots</h3><div id="experienceDetail"></div></article>
    </div>
  `;
}

function refreshExperiences() {
  const destination = document.getElementById("experienceDestination")?.value?.trim() || currentPlanDestination();
  const category = document.getElementById("experienceFilter")?.value || "All";
  bookingState.experienceResults = buildExperienceOptions(destination).filter((item) => category === "All" || item.tag === category);
  if (!bookingState.experienceSelection || !bookingState.experienceResults.some((item) => item.id === bookingState.experienceSelection.id)) {
    bookingState.experienceSelection = bookingState.experienceResults[0] || null;
  }
  const results = document.getElementById("experienceResults");
  if (results) results.innerHTML = bookingState.experienceResults.map(experienceCard).join("");
  results?.querySelectorAll("[data-select-experience]").forEach((button) => {
    button.addEventListener("click", () => {
      bookingState.experienceSelection = bookingState.experienceResults.find((item) => item.id === button.dataset.selectExperience) || null;
      renderExperienceDetail();
      persistState();
    });
  });
  renderExperienceDetail();
  renderModuleStatus();
  persistState();
}

function renderExperienceDetail() {
  const holder = document.getElementById("experienceDetail");
  if (!holder) return;
  const item = bookingState.experienceSelection;
  if (!item) {
    holder.innerHTML = `<article class="booking-empty">Select an experience to see the slot and confirmation details.</article>`;
    return;
  }
  holder.innerHTML = `
    <article class="booking-summary-card">
      <p class="eyebrow">Experience detail</p>
      <h3>${escapeHtml(item.category)}</h3>
      <div class="booking-summary-list">
        <div><strong>${formatCurrency(item.pricePerPerson)}</strong><span>Price per person</span></div>
        <div><strong>${escapeHtml(String(item.durationHours))}h</strong><span>Duration</span></div>
        <div><strong>${escapeHtml(item.confirmationType)}</strong><span>Confirmation</span></div>
        <div><strong>${escapeHtml(String(item.minGroupSize))}</strong><span>Group size</span></div>
      </div>
      <div class="booking-tags">${item.slots.map((slot) => `<span>${escapeHtml(slot)}</span>`).join("")}</div>
      <p>${escapeHtml(item.meetingPoint)}</p>
      <p>${escapeHtml(item.why)}</p>
      <button class="button button-primary" type="button" id="saveExperienceTrip">Save experience</button>
    </article>
  `;
  document.getElementById("saveExperienceTrip")?.addEventListener("click", () => {
    saveCurrentSelection(
      "experiences",
      `Experience: ${item.category}`,
      `${item.tag}, ${formatCurrency(item.pricePerPerson)} per person`,
      { price: item.pricePerPerson, experience: item },
    );
  });
}

function buildMyraModuleMarkup() {
  return `
    <div class="section-head"><div><p class="eyebrow">Myra</p><h2>Conversational booking assistant</h2></div></div>
    <div class="booking-module-grid">
      <form id="myraForm" class="booking-form">
        <label>Your request<textarea id="myraPrompt" rows="5" placeholder="Book me a flight from Mumbai to Goa under 5000 with no stops."></textarea></label>
        <div class="hero-actions">
          <button class="button button-primary" type="submit">Ask Myra</button>
          <button class="button button-secondary" type="button" id="myraClear">Clear chat</button>
        </div>
      </form>
      <article class="sidebar-card">
        <p class="eyebrow">Quick prompts</p>
        <h3>Try these</h3>
        <div id="myraSuggestions" class="myra-chip-grid"></div>
      </article>
    </div>
    <div class="workflow-card">
      <p class="eyebrow">Myra response</p>
      <h3>Booking intelligence</h3>
      <div id="myraOutput" class="myra-output"></div>
    </div>
  `;
}

function renderMyraSuggestions() {
  const holder = document.getElementById("myraSuggestions");
  if (!holder) return;
  holder.innerHTML = [
    "Book me a flight from Mumbai to Goa under 5000 with no stops.",
    "Suggest a 5 day trip under 30000 from Hyderabad for 2 people.",
    "Find a family hotel in Jaipur with pool and free cancellation.",
  ].map((prompt) => `<button type="button" class="myra-chip" data-myra-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join("");
  holder.querySelectorAll("[data-myra-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("myraPrompt").value = button.dataset.myraPrompt || "";
      sendMyraMessage();
    });
  });
}

async function sendMyraMessage() {
  const prompt = document.getElementById("myraPrompt")?.value?.trim();
  const output = document.getElementById("myraOutput");
  if (!prompt || !output || myraBusy) return;
  myraBusy = true;
  bookingState.myraConversation.push({ role: "user", text: prompt });
  output.innerHTML = bookingState.myraConversation.map((message) => `<article class="myra-bubble ${message.role}">${renderChatBody(message.text, message.role)}</article>`).join("");
  const bubble = document.createElement("article");
  bubble.className = "myra-bubble assistant";
  bubble.innerHTML = `<p class="eyebrow">Myra</p><p>Checking travel intelligence...</p>`;
  output.appendChild(bubble);
  const response = await queryBackend(`Help the user plan booking options from this request: ${prompt}. Return concrete travel suggestions with prices, routes and useful booking steps.`, { useTripContext: false }).catch((error) => error?.message || "YatraAI backend is unavailable. Start the backend first.");
  myraBusy = false;
  bubble.innerHTML = `<p class="eyebrow">Myra</p>${renderChatBody(response, "assistant")}`;
  bookingState.myraConversation.push({ role: "assistant", text: response });
  const routeMatch = prompt.match(/from\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s|,|\.|$)/i);
  if (routeMatch) {
    document.getElementById("flightOrigin").value = routeMatch[1].trim();
    document.getElementById("flightDestination").value = routeMatch[2].trim();
    await refreshFlights();
    setActiveModule("flights");
  }
  output.scrollIntoView({ behavior: "smooth", block: "end" });
}

function initModuleMarkup() {
  document.getElementById("flightsModule").innerHTML = buildFlightModuleMarkup();
  document.getElementById("hotelsModule").innerHTML = buildHotelModuleMarkup();
  document.getElementById("busesModule").innerHTML = buildBusModuleMarkup();
  document.getElementById("trainsModule").innerHTML = buildTrainModuleMarkup();
  document.getElementById("carsModule").innerHTML = buildCabModuleMarkup();
  document.getElementById("packagesModule").innerHTML = buildPackageModuleMarkup();
  document.getElementById("experiencesModule").innerHTML = buildExperienceModuleMarkup();
  document.getElementById("myraModule").innerHTML = buildMyraModuleMarkup();
}

function buildBookingsMarkup() {
  return `
    <section class="page-hero bookings-hero">
      <p class="eyebrow">MakeMyTrip MVP</p>
      <h1>Bookings that work end to end</h1>
      <p>Flights, hotels, buses, trains, cabs, packages, experiences and Myra all live in one working hub with local search data, backend confirmations and Ollama-backed explanations.</p>
      <div class="hero-actions">${MODULES.map(([key, label]) => `<a class="button button-secondary" href="#${key}Module">${label}</a>`).join("")}</div>
      <div class="booking-hero-stats" id="bookingHeroContext"></div>
    </section>
    <section class="section booking-tabs-section">
      <div class="section-head">
        <div><p class="eyebrow">Quick jump</p><h2>Choose a booking module</h2></div>
        <p class="section-note">Every module below can search, filter, select and save a booking entry to My Trips.</p>
      </div>
      <div class="booking-tabs" id="bookingModuleTabs"></div>
    </section>
    <section class="section booking-layout">
      <aside class="booking-sidebar">
        <article class="sidebar-card">
          <p class="eyebrow">My Trips</p>
          <h3>Saved bookings</h3>
          <div id="savedTripsCount" class="booking-count"></div>
          <div id="savedTripsList" class="saved-trips-list"></div>
        </article>
        <article class="sidebar-card">
          <p class="eyebrow">Module status</p>
          <h3>Live result counts</h3>
          <div id="bookingModuleStatus" class="booking-status-grid"></div>
        </article>
      </aside>
      <div class="booking-main">
        <article class="booking-module is-active" id="flightsModule" data-booking-module="flights"></article>
        <article class="booking-module" id="hotelsModule" data-booking-module="hotels"></article>
        <article class="booking-module" id="busesModule" data-booking-module="buses"></article>
        <article class="booking-module" id="trainsModule" data-booking-module="trains"></article>
        <article class="booking-module" id="carsModule" data-booking-module="cars"></article>
        <article class="booking-module" id="packagesModule" data-booking-module="packages"></article>
        <article class="booking-module" id="experiencesModule" data-booking-module="experiences"></article>
        <article class="booking-module" id="myraModule" data-booking-module="myra"></article>
      </div>
    </section>
  `;
}

export function bookingsMarkup() {
  return buildBookingsMarkup();
}

function renderBookingHeroContext() {
  const holder = document.getElementById("bookingHeroContext");
  if (!holder) return;
  const plan = getPlan();
  holder.innerHTML = `
    <div>${renderShellStat("Saved trips", bookingState.savedTrips.length)}</div>
    <div>${renderShellStat("Current trip", plan?.place?.name || "None")}</div>
    <div>${renderShellStat("Active module", MODULES.find((item) => item[0] === bookingState.activeModule)?.[1] || "Flights")}</div>
    <div>${renderShellStat("Last booking", bookingState.lastBooking?.reference || "None")}</div>
  `;
}

function bindHotelInterests() {
  const holder = document.getElementById("hotelInterests");
  if (!holder) return;
  const interests = ["Family", "Couple", "Friends", "Solo", "Luxury", "Budget"];
  holder.innerHTML = interests.map((interest, index) => `<button type="button" class="chip ${index === 0 ? "active" : ""}" data-value="${interest}">${interest}</button>`).join("");
  holder.querySelectorAll("[data-value]").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("active");
      refreshHotels();
    });
  });
}

export async function initBookings() {
  bookingState.savedTrips = loadTrips();
  try {
    const raw = localStorage.getItem(BOOKING_STATE_KEY);
    if (raw) bookingState = { ...bookingState, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  if (!bookingState.bookingSessionId) {
    bookingState.bookingSessionId = createBookingSessionId();
  }
  initModuleMarkup();
  renderModuleTabs();
  bindHotelInterests();
  renderSavedTrips();
  renderBookingHeroContext();
  renderModuleStatus();
  renderMyraSuggestions();

  const destination = currentPlanDestination();
  document.getElementById("flightDestination").value = destination;
  document.getElementById("hotelCity").value = destination;
  document.getElementById("packageDestination").value = destination;
  document.getElementById("experienceDestination").value = destination;
  document.getElementById("multiCityLegs").classList.add("hidden-field");

  document.getElementById("flightSearchForm").addEventListener("input", debounce(refreshFlights, 150));
  document.getElementById("flightTripType").addEventListener("change", () => {
    const isMultiCity = document.getElementById("flightTripType").value === "Multi-city";
    document.getElementById("multiCityLegs").classList.toggle("hidden-field", !isMultiCity);
    document.getElementById("flightMultiCity").checked = isMultiCity;
    refreshFlights();
  });
  document.getElementById("flightMultiCity").addEventListener("change", () => {
    document.getElementById("multiCityLegs").classList.toggle("hidden-field", !document.getElementById("flightMultiCity").checked);
    refreshFlights();
  });
  document.getElementById("flightMealSelect").addEventListener("change", () => { bookingState.flightAddonMeals = document.getElementById("flightMealSelect").value; renderFlightBookingSummary(); persistState(); });
  document.getElementById("flightBaggage").addEventListener("input", () => { bookingState.flightBaggage = Number(document.getElementById("flightBaggage").value || 10); renderFlightBookingSummary(); persistState(); });
  document.getElementById("flightInsurance").addEventListener("change", () => { bookingState.flightInsurance = document.getElementById("flightInsurance").checked; renderFlightBookingSummary(); persistState(); });
  document.getElementById("flightFastTrack").addEventListener("change", () => { bookingState.flightFastTrack = document.getElementById("flightFastTrack").checked; renderFlightBookingSummary(); persistState(); });
  document.getElementById("flightLockDays").addEventListener("change", () => { bookingState.flightLockDays = Number(document.getElementById("flightLockDays").value || 3); renderFlightBookingSummary(); persistState(); });
  document.getElementById("flightCoupon").addEventListener("input", renderFlightBookingSummary);
  document.getElementById("flightPoints").addEventListener("input", renderFlightBookingSummary);
  document.getElementById("flightBookButton").addEventListener("click", () => {
    if (!bookingState.flightSelection) return;
    saveCurrentSelection(
      "flights",
      `Flight: ${bookingState.flightSelection.airline} ${bookingState.flightSelection.flightNo}`,
      `${bookingState.flightSelection.depart} to ${bookingState.flightSelection.arrive}, seat ${bookingState.flightSeat?.label || "auto"}, ${formatCurrency(bookingState.flightSelection.price)}`,
      {
        price: bookingState.flightSelection.price,
        flight: bookingState.flightSelection,
        seat: bookingState.flightSeat?.label || "auto",
        meal: bookingState.flightAddonMeals,
        baggage: bookingState.flightBaggage,
        insurance: bookingState.flightInsurance,
        fastTrack: bookingState.flightFastTrack,
        lockDays: bookingState.flightLockDays,
      },
    );
  });

  document.getElementById("hotelSearchForm").addEventListener("input", debounce(refreshHotels, 180));
  document.getElementById("hotelSearchForm").addEventListener("change", debounce(refreshHotels, 180));
  document.getElementById("hotelListView").addEventListener("click", () => { bookingState.hotelView = "list"; renderHotels("list"); });
  document.getElementById("hotelMapToggle").addEventListener("click", () => { bookingState.hotelView = "map"; renderHotels("map"); });
  document.getElementById("hotelViewMode").addEventListener("change", (event) => { bookingState.hotelView = event.target.value; renderHotels(event.target.value); });
  document.getElementById("hotelRefreshSummary").addEventListener("click", () => { bookingState.hotelSummaryCache = {}; renderHotelDetail(); showToast("Hotel summary refreshed.", "default"); });

  document.getElementById("busSearchForm").addEventListener("input", debounce(refreshBuses, 160));
  document.getElementById("busSearchForm").addEventListener("change", debounce(refreshBuses, 160));

  document.getElementById("trainSearchForm").addEventListener("input", debounce(refreshTrains, 160));
  document.getElementById("trainSearchForm").addEventListener("change", debounce(refreshTrains, 160));
  document.getElementById("trainQuota").addEventListener("change", refreshTrains);
  document.getElementById("trainPnr").addEventListener("input", (event) => { bookingState.pnrLookup = event.target.value.trim(); persistState(); renderPnrResult(); });

  document.getElementById("cabSearchForm").addEventListener("input", debounce(refreshCars, 150));
  document.getElementById("cabSearchForm").addEventListener("change", debounce(refreshCars, 150));

  document.getElementById("packageSearchForm").addEventListener("input", debounce(refreshPackages, 180));
  document.getElementById("packageSearchForm").addEventListener("change", debounce(refreshPackages, 180));

  document.getElementById("experienceSearchForm").addEventListener("input", debounce(refreshExperiences, 150));
  document.getElementById("experienceSearchForm").addEventListener("change", debounce(refreshExperiences, 150));

  document.getElementById("myraForm").addEventListener("submit", (event) => {
    event.preventDefault();
    sendMyraMessage().catch((error) => showToast(error?.message || "YatraAI backend is unavailable. Start the backend first.", "warning"));
  });
  document.getElementById("myraClear").addEventListener("click", () => {
    bookingState.myraConversation = [];
    document.getElementById("myraOutput").innerHTML = "";
    document.getElementById("myraPrompt").value = "";
    showToast("Myra chat cleared.", "default");
  });

  await Promise.allSettled([
    refreshFlights(),
    refreshHotels(),
    refreshBuses(),
    refreshTrains(),
    refreshCars(),
    refreshPackages(),
    refreshExperiences(),
  ]);

  const active = new URLSearchParams(window.location.search).get("module");
  if (active && MODULES.some(([key]) => key === active)) setActiveModule(active);
  persistState();
}
