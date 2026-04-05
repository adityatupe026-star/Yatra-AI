import { EMERGENCY_CONTACTS, REGION_SEASONS, STATE_PHRASES } from "../core/config.js";
import { getPlan } from "../core/state.js";
import { destinationPlaces, interestOptions } from "../data/site-data.js";
import { queryBackend } from "../utils/ai.js";
import { getRestaurantSuggestions, getNearbySuggestions } from "../utils/restaurants.js";
import { getTravelRecommendations } from "../utils/recommendations.js";
import { buildGoogleMapsPlaceLink } from "../utils/travel.js";
import { fetchWeather } from "../utils/weather.js";

const INTEREST_THEMES = {
  Food: { icon: "🍽️", color: "#f97316", gradient: "linear-gradient(135deg,#f97316,#ef4444)" },
  Culture: { icon: "🏛️", color: "#8b5cf6", gradient: "linear-gradient(135deg,#8b5cf6,#6366f1)" },
  Nature: { icon: "🌿", color: "#22c55e", gradient: "linear-gradient(135deg,#22c55e,#15803d)" },
  Adventure: { icon: "🧗", color: "#ef4444", gradient: "linear-gradient(135deg,#ef4444,#f97316)" },
  Spiritual: { icon: "🪔", color: "#eab308", gradient: "linear-gradient(135deg,#eab308,#f97316)" },
  Beach: { icon: "🏖️", color: "#06b6d4", gradient: "linear-gradient(135deg,#06b6d4,#3b82f6)" },
  Wildlife: { icon: "🐾", color: "#16a34a", gradient: "linear-gradient(135deg,#16a34a,#14532d)" },
  Wellness: { icon: "🧘", color: "#14b8a6", gradient: "linear-gradient(135deg,#14b8a6,#0f766e)" },
  "Road Trip": { icon: "🚗", color: "#0891b2", gradient: "linear-gradient(135deg,#0891b2,#6366f1)" },
  Nightlife: { icon: "🌙", color: "#7c3aed", gradient: "linear-gradient(135deg,#7c3aed,#ec4899)" },
  Photography: { icon: "📷", color: "#f59e0b", gradient: "linear-gradient(135deg,#f59e0b,#ef4444)" },
  Family: { icon: "👨‍👩‍👧‍👦", color: "#f59e0b", gradient: "linear-gradient(135deg,#f59e0b,#22c55e)" },
  Romance: { icon: "❤️", color: "#ec4899", gradient: "linear-gradient(135deg,#ec4899,#f97316)" },
  Shopping: { icon: "🛍️", color: "#db2777", gradient: "linear-gradient(135deg,#db2777,#f59e0b)" },
  Luxury: { icon: "✨", color: "#d97706", gradient: "linear-gradient(135deg,#d97706,#7c3aed)" },
};

function buildItems(items) {
  return items.map((item) => `<div class="exp-item"><span class="exp-item-text">${item}</span></div>`).join("");
}

function uniqueItems(items, limit = 4) {
  return [...new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, limit);
}

function parseJsonObject(text) {
  const cleaned = String(text || "").replace(/```json/gi, "```").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function buildInterestSection(title, icon, items) {
  return `
    <div class="exp-section">
      <div class="exp-section-head">
        <span class="exp-section-icon">${icon}</span>
        <h4>${title}</h4>
      </div>
      <div class="exp-items-list">${buildItems(items)}</div>
    </div>
  `;
}

function buildLocalInterestData(place, interest, travelBrief) {
  const [primaryTag = interest, secondaryTag = interest] = place.tags;
  const relatedPlaces = destinationPlaces
    .filter((item) => item.region === place.region && item.name !== place.name)
    .slice(0, 5)
    .map((item) => `${item.name} in ${item.state}`);
  const recommendationPlaces = (travelBrief?.places || []).map((item) => item.name).filter(Boolean);
  const recommendationHotels = (travelBrief?.hotels || []).map((item) => item.name).filter(Boolean);
  const restaurantNames = getRestaurantSuggestions(place.name);
  const nearbyThemes = {
    cafes: getNearbySuggestions(place, "cafe"),
    temples: getNearbySuggestions(place, "temples"),
    shopping: getNearbySuggestions(place, "shopping"),
    beaches: getNearbySuggestions(place, "beaches"),
    forts: getNearbySuggestions(place, "forts"),
  };

  switch (interest) {
    case "Food":
      return {
        streets: uniqueItems([
          ...restaurantNames.slice(0, 4).map((name) => `${name} ${place.state === "Goa" ? "for seafood" : "for a local meal"}`),
          ...nearbyThemes.cafes.slice(0, 2),
        ]),
        dishes: uniqueItems([
          `${place.name} local specialties based on ${primaryTag.toLowerCase()}`,
          `${place.state} signature dishes`,
          `Ask for the house recommendation near ${place.highlights[0]}`,
          `A good tasting plate for a ${secondaryTag.toLowerCase()} stop`,
        ]),
        restaurants: uniqueItems([
          ...restaurantNames.slice(0, 4),
          ...(recommendationHotels.slice(0, 2).map((name) => `${name} dining option`)),
        ]),
        markets: uniqueItems([
          ...nearbyThemes.shopping.slice(0, 3),
          `${place.name} main market for snacks and spices`,
          `${place.highlights[1] || place.name} evening food lane`,
        ]),
      };
    case "Culture":
      return {
        heritage: uniqueItems([
          ...place.highlights.map((highlight) => `${highlight} heritage stop`),
          ...relatedPlaces.slice(0, 2),
        ]),
        museums: uniqueItems([
          `${place.name} museum circuit`,
          `${place.state} heritage museum`,
          ...nearbyThemes.forts.slice(0, 2),
        ]),
        crafts: uniqueItems([
          `${place.state} handloom and craft work`,
          `${place.name} artisan market`,
          `Local workshop based on ${primaryTag.toLowerCase()}`,
          `Street craft lane near ${place.name}`,
        ]),
        experiences: uniqueItems([
          `${place.name} guided heritage walk`,
          `Evening cultural program in ${place.name}`,
          `Festival or folk performance if available`,
          `Old-town storytelling route`,
        ]),
      };
    case "Nature":
      return {
        parks: uniqueItems([
          `${place.name} green or garden stop`,
          `${place.state} nature reserve`,
          ...relatedPlaces.slice(0, 2),
        ]),
        viewpoints: uniqueItems([
          `${place.highlights[0]} viewpoint`,
          `${place.highlights[1] || place.name} sunrise point`,
          `${place.name} hill or lake lookout`,
          `Golden-hour frame from a high point`,
        ]),
        water: uniqueItems([
          `${place.name} lake, river or backwater`,
          `Waterfall or river stop near ${place.name}`,
          `Boat or quiet water walk`,
          `Scenic water-side break`,
        ]),
        trails: uniqueItems([
          `${place.name} nature walk`,
          `Short scenic trail around ${place.region}`,
          `Tea, forest or countryside path`,
          `Half-day outdoor loop`,
        ]),
      };
    case "Adventure":
      return {
        water: uniqueItems([
          `${place.name} water adventure`,
          `River or lake activity nearby`,
          `Paddle or boat session`,
          `If available, choose the morning slot`,
        ]),
        aerial: uniqueItems([
          `${place.name} aerial viewpoint`,
          `Paragliding or zip-line option`,
          `High view over ${place.highlights[0]}`,
          `Sunrise launch point`,
        ]),
        land: uniqueItems([
          `${place.name} trekking or biking route`,
          `Rock, dune or forest activity`,
          `Adventure stop in ${place.region}`,
          `Open-road stretch with scenic pauses`,
        ]),
        expeditions: uniqueItems([
          ...recommendationPlaces.slice(0, 3),
          `Two-day route through ${place.region}`,
          `Offbeat extension from ${place.name}`,
          `Longer road circuit using nearby destinations`,
        ]),
      };
    case "Spiritual":
      return {
        temples: uniqueItems([
          ...nearbyThemes.temples.slice(0, 3),
          `${place.name} main temple or shrine`,
        ]),
        monasteries: uniqueItems([
          `${place.name} meditation center`,
          `${place.state} spiritual retreat`,
          `Quiet monastery or prayer hall nearby`,
          `Pilgrim stop with calm hours`,
        ]),
        ghats: uniqueItems([
          `${place.name} riverfront or ghat`,
          `${place.name} sunrise prayer point`,
          `Evening aarti or ritual view`,
          `Sacred water edge`,
        ]),
        experiences: uniqueItems([
          `${place.name} early morning ritual`,
          `Guided spiritual walk`,
          `Sunset prayer or aarti`,
          `Quiet retreat style morning`,
        ]),
      };
    case "Beach":
      return {
        beaches: uniqueItems([
          ...nearbyThemes.beaches.slice(0, 3),
          `${place.name} coastline or waterfront`,
        ]),
        sports: uniqueItems([
          `${place.name} water sports`,
          `Surf, kayak or snorkel if available`,
          `Morning activity before the heat rises`,
          `Local operator-led beach activity`,
        ]),
        shacks: uniqueItems([
          `${place.name} beach shack or cafe`,
          `Sea-facing lunch stop`,
          `Casual seafood place`,
          `Sunset drinks by the coast`,
        ]),
        tips: uniqueItems([
          `Check tide and safety flags`,
          `Go early for calmer water`,
          `Keep a light layer for evening wind`,
          `Use daylight for swimming and photos`,
        ]),
      };
    case "Wildlife":
      return {
        safaris: uniqueItems([
          `${place.name} safari or reserve`,
          `Early-morning forest drive`,
          `Guided wildlife outing`,
          `Spotting route near ${place.region}`,
        ]),
        parks: uniqueItems([
          `${place.state} sanctuary or national park`,
          `Buffer-zone nature drive`,
          `Interpretive center or forest edge`,
          `Protected habitat visit`,
        ]),
        birds: uniqueItems([
          `Birdwatching at dawn`,
          `Wetland or grassland watch`,
          `Quiet trail for sightings`,
          `Bring binoculars and keep noise low`,
        ]),
        tips: uniqueItems([
          `Start early for animal activity`,
          `Keep colors neutral`,
          `Book permits before you go`,
          `Follow guide instructions closely`,
        ]),
      };
    case "Wellness":
      return {
        retreats: uniqueItems([
          `${place.name} wellness retreat`,
          `Ayurveda or spa stay near ${place.name}`,
          `Calm property with slower pacing`,
          `Nature-led reset in the region`,
        ]),
        yoga: uniqueItems([
          `Morning yoga deck`,
          `Breathwork or meditation session`,
          `Quiet sunrise stretch`,
          `Garden or riverside yoga`,
        ]),
        spa: uniqueItems([
          `Therapy massage`,
          `Steam and recovery`,
          `Herbal treatment`,
          `Book a calm evening slot`,
        ]),
        food: uniqueItems([
          `Light vegetarian meal`,
          `Clean-eating cafe`,
          `Herbal tea or tonic stop`,
          `Digestive-friendly dinner`,
        ]),
      };
    case "Road Trip":
      return {
        drives: uniqueItems([
          `${place.name} scenic drive`,
          `${place.region} circuit route`,
          `Sunrise departure for empty roads`,
          `Flexible stop-based route`,
        ]),
        pitstops: uniqueItems([
          `${place.name} tea or coffee stop`,
          `Fuel and snack break near the highway`,
          `Photo stop near ${place.highlights[0]}`,
          `Lunch halt on the route`,
        ]),
        tips: uniqueItems([
          `Check road conditions before leaving`,
          `Carry offline maps and water`,
          `Keep cash for tolls`,
          `Avoid late-night mountain drives`,
        ]),
        logistics: uniqueItems([
          `Reliable fuel stop nearby`,
          `Parking-friendly stay`,
          `Clean washroom rest stop`,
          `Backup repair contact saved offline`,
        ]),
      };
    case "Nightlife":
      return {
        bars: uniqueItems([
          `${place.name} rooftop bar`,
          `Late-evening lounge in town`,
          `Cocktail terrace`,
          `City-view bar`,
        ]),
        clubs: uniqueItems([
          `Weekend dance floor`,
          `Live DJ venue`,
          `After-dark party stretch`,
          `Late-night club circuit`,
        ]),
        music: uniqueItems([
          `Live music cafe`,
          `Open-mic or indie set`,
          `Cultural performance`,
          `Evening jazz or acoustic night`,
        ]),
        food: uniqueItems([
          `Late-night food stalls`,
          `Night market bites`,
          `Kebab or biryani stop`,
          `Dessert and chai run`,
        ]),
      };
    case "Photography":
      return {
        sunrise: uniqueItems([
          `${place.highlights[0]} at sunrise`,
          `Blue-hour street frames`,
          `Early morning ghat or shore`,
          `Empty-lane first-light shot`,
        ]),
        golden: uniqueItems([
          `${place.highlights[1] || place.name} at golden hour`,
          `Backlit architecture shot`,
          `Rooftop silhouette`,
          `Warm sunset portrait spot`,
        ]),
        street: uniqueItems([
          `Market lane street scenes`,
          `Daily life around ${place.name}`,
          `Textured old-town corner`,
          `Colorful local traffic`,
        ]),
        tips: uniqueItems([
          `Arrive before sunrise for clean frames`,
          `Use side light for texture`,
          `Carry a lightweight lens kit`,
          `Scout the view the day before`,
        ]),
      };
    case "Family":
      return {
        attractions: uniqueItems([
          `${place.name} kid-friendly stop`,
          `Easy sightseeing loop`,
          `Interactive museum or park`,
          `Gentle activity for mixed ages`,
        ]),
        stays: uniqueItems([
          ...recommendationHotels.slice(0, 3),
          `Family hotel with pool`,
          `Safe central stay`,
        ]),
        dining: uniqueItems([
          ...restaurantNames.slice(0, 3),
          `Clean veg-friendly restaurant`,
          `Quiet family dining room`,
        ]),
        tips: uniqueItems([
          `Keep travel days shorter`,
          `Plan rest breaks every few hours`,
          `Choose early starts for monuments`,
          `Carry snacks and water`,
        ]),
      };
    case "Romance":
      return {
        stays: uniqueItems([
          ...recommendationHotels.slice(0, 3),
          `Heritage stay in ${place.name}`,
          `Sunset-view suite`,
        ]),
        experiences: uniqueItems([
          `${place.name} slow walk or boat ride`,
          `Couples spa session`,
          `Private sunset plan`,
          `Candlelit evening dinner`,
        ]),
        sunsets: uniqueItems([
          `${place.highlights[0]} at dusk`,
          `Rooftop for the last light`,
          `Waterfront dusk spot`,
          `Quiet hill-view evening`,
        ]),
        dining: uniqueItems([
          ...restaurantNames.slice(0, 3),
          `Intimate dinner with views`,
          `Chef-led tasting menu`,
        ]),
      };
    case "Shopping":
      return {
        markets: uniqueItems([
          ...nearbyThemes.shopping.slice(0, 4),
          `${place.name} bazaar`,
        ]),
        souvenirs: uniqueItems([
          `${place.state} craft piece`,
          `Local snack to carry back`,
          `Textile or handmade buy`,
          `Tea, spice or artisan product`,
        ]),
        labels: uniqueItems([
          `Boutique store with local design`,
          `Heritage brand in the old city`,
          `Independent label`,
          `Curated concept shop`,
        ]),
        tips: uniqueItems([
          `Compare prices before buying`,
          `Carry cash for small stalls`,
          `Ask about shipping for larger items`,
          `Shop earlier in the day for calmer lanes`,
        ]),
      };
    case "Luxury":
      return {
        stays: uniqueItems([
          ...recommendationHotels.slice(0, 4),
          `Iconic luxury stay in ${place.name}`,
        ]),
        dining: uniqueItems([
          ...restaurantNames.slice(0, 4),
          `Chef's table or tasting menu`,
        ]),
        experiences: uniqueItems([
          `Private guided tour in ${place.name}`,
          `Curated sunset transfer`,
          `Exclusive boat or car ride`,
          `Concierge-arranged evening`,
        ]),
        wellness: uniqueItems([
          `Spa day`,
          `Steam and recovery`,
          `Massage before dinner`,
          `Pool and lounge afternoon`,
        ]),
      };
    default:
      return {
        overview: uniqueItems([
          `${place.name} is a strong fit for ${interest.toLowerCase()} trips`,
          ...place.highlights,
          ...recommendationPlaces.slice(0, 2),
        ]),
        more: uniqueItems([
          `Use ${primaryTag} as the anchor`,
          `Mix with ${secondaryTag} for a fuller route`,
          `Pair with nearby day trips`,
          `Keep one flexible afternoon`,
        ]),
        tips: uniqueItems([
          `Book early for peak season`,
          `Check hours before you go`,
          `Leave room for one slower stop`,
          `Bring offline maps and tickets`,
        ]),
        extras: uniqueItems([
          `Ask locally for the best current pick`,
          `Save the route in your trip plan`,
          `Check weather before travel`,
          `Use the current trip button to reuse this place`,
        ]),
      };
  }
}

async function buildInterestData(place, interest, travelBrief) {
  const localData = buildLocalInterestData(place, interest, travelBrief);
  const sections = Object.keys(localData);
  const needsAi = sections.some((key) => (localData[key] || []).length < 3);
  if (!needsAi) return localData;

  const prompt = `
Return JSON only, no markdown.
Use the verified local data below and fill any missing section with place-specific, practical suggestions.
Do not change the section keys.

Destination:
${JSON.stringify({
    name: place.name,
    state: place.state,
    region: place.region,
    highlights: place.highlights,
    tags: place.tags,
    season: REGION_SEASONS[place.region],
    officialUrl: place.officialUrl,
    restaurants: getRestaurantSuggestions(place.name).slice(0, 6),
    nearby: (travelBrief?.places || []).map((item) => item.name).slice(0, 6),
    hotels: (travelBrief?.hotels || []).map((item) => item.name).slice(0, 4),
  }, null, 2)}

Interest: ${interest}
Required sections: ${sections.join(", ")}

Return this exact shape:
${JSON.stringify(Object.fromEntries(sections.map((key) => [key, ["item 1", "item 2", "item 3", "item 4"]])), null, 2)}
`;

  const response = await queryBackend(prompt, { useTripContext: false }).catch(() => null);
  const aiData = parseJsonObject(response) || {};
  return sections.reduce((acc, key) => {
    acc[key] = uniqueItems([...(localData[key] || []), ...(aiData[key] || [])], 4);
    return acc;
  }, {});
}

function buildInterestResults(place, interest, data) {
  const theme = INTEREST_THEMES[interest] || INTEREST_THEMES.Food;
  const sections = Object.entries(data)
    .map(([key, items]) => buildInterestSection(key.replace(/^\w/, (char) => char.toUpperCase()), theme.icon, items))
    .join("");

  return `
    <div class="exp-results-wrap">
      <div class="exp-results-header" style="background:${theme.gradient}">
        <span class="exp-results-icon">${theme.icon}</span>
        <div>
          <h3>${interest} in ${place.name}</h3>
          <p>Curated ${interest.toLowerCase()} ideas around ${place.name} that line up with the current trip, nearby routes and a practical travel rhythm.</p>
        </div>
      </div>
      <div class="exp-sections-grid">${sections}</div>
    </div>
  `;
}

function interestLabel(interest) {
  return `${(INTEREST_THEMES[interest] || INTEREST_THEMES.Food).icon} ${interest}`;
}

export function explorerMarkup() {
  return `
    <section class="page-hero">
      <p class="eyebrow">Explorer</p>
      <h1>Discover Any Place by Interest</h1>
      <p>Enter a destination, pick an interest, and get a sharper picture of what to eat, see, do and pair nearby.</p>
    </section>
    <section class="section planner-layout single-top">
      <div class="ai-console">
        <form class="quick-planner" id="explorerSearchForm">
          <div class="exp-search-row">
            <div class="exp-search-field">
              <label for="explorerPlaceInput">Place name</label>
              <input id="explorerPlaceInput" list="explorerPlaceSuggestions" type="text" placeholder="Jaipur, Goa, Varanasi, Leh" autocomplete="off">
            </div>
            <div class="exp-search-field">
              <label for="explorerInterest">Interest</label>
              <select id="explorerInterest">${interestOptions.map((interest) => `<option value="${interest}">${interestLabel(interest)}</option>`).join("")}</select>
            </div>
          </div>
          <div class="exp-interest-chips" id="expInterestChips">
            ${interestOptions.map((interest) => `<button class="exp-chip" type="button" data-interest="${interest}">${interestLabel(interest)}</button>`).join("")}
          </div>
          <div class="hero-actions planner-actions">
            <button class="button button-primary" id="explorePlaceButton" type="submit">Explore Place</button>
            <button class="button button-secondary" type="button" id="explorerUseCurrentTrip">Use My Current Trip</button>
          </div>
          <datalist id="explorerPlaceSuggestions">${destinationPlaces.map((place) => `<option value="${place.name}"></option>`).join("")}</datalist>
        </form>
      </div>
      <aside class="planner-sidebar">
        <article class="sidebar-card" id="explorerWeatherCard"><div class="weather-skeleton skeleton shimmer"></div></article>
        <article class="sidebar-card" id="accessCard"></article>
        <article class="sidebar-card" id="emergencyCard"></article>
      </aside>
    </section>
    <section class="section" id="explorerResultsSection" style="display:none">
      <div id="overviewCard"></div>
      <div id="interestResultsArea"></div>
      <div class="exp-extra-grid">
        <article class="sidebar-card" id="nearbyCard"></article>
        <article class="sidebar-card" id="phrasebookCard"></article>
      </div>
    </section>
  `;
}

export function initExplorer() {
  const form = document.getElementById("explorerSearchForm");
  const placeInput = document.getElementById("explorerPlaceInput");
  const interestSelect = document.getElementById("explorerInterest");
  const interestArea = document.getElementById("interestResultsArea");
  const overviewCard = document.getElementById("overviewCard");
  const accessCard = document.getElementById("accessCard");
  const nearbyCard = document.getElementById("nearbyCard");
  const weatherCard = document.getElementById("explorerWeatherCard");
  const phrasebookCard = document.getElementById("phrasebookCard");
  const emergencyCard = document.getElementById("emergencyCard");
  const exploreButton = document.getElementById("explorePlaceButton");
  const resultsSection = document.getElementById("explorerResultsSection");
  const chips = document.getElementById("expInterestChips");
  const currentTripButton = document.getElementById("explorerUseCurrentTrip");

  if (!form || !placeInput || !interestSelect || !overviewCard || !accessCard || !nearbyCard || !weatherCard || !phrasebookCard || !emergencyCard || !exploreButton || !resultsSection || !interestArea) {
    return;
  }

  const syncActiveChip = () => {
    chips?.querySelectorAll(".exp-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.interest === interestSelect.value);
    });
  };

  chips?.addEventListener("click", (event) => {
    const chip = event.target.closest(".exp-chip");
    if (!chip) return;
    interestSelect.value = chip.dataset.interest || interestSelect.value;
    syncActiveChip();
  });

  interestSelect.addEventListener("change", () => {
    syncActiveChip();
    void paint();
  });
  syncActiveChip();

  const resolvePlace = () => {
    const raw = (placeInput.value || "").trim().toLowerCase();
    return destinationPlaces.find((item) => item.name.toLowerCase() === raw)
      || destinationPlaces.find((item) => item.name.toLowerCase().includes(raw))
      || destinationPlaces.find((item) => item.state.toLowerCase().includes(raw))
      || getPlan()?.place
      || destinationPlaces[0];
  };

  const paint = async () => {
    const place = resolvePlace();
    const interest = interestSelect.value || "Food";
    const season = REGION_SEASONS[place.region] || REGION_SEASONS.North;
    const phrases = STATE_PHRASES[place.state] || STATE_PHRASES.Rajasthan;
    const emergency = EMERGENCY_CONTACTS[place.state] || EMERGENCY_CONTACTS.default;
    const travelBrief = await getTravelRecommendations({
      destination: place.name,
      stayPreference: getPlan()?.stayPreference || "",
      budget: String(getPlan()?.budget || ""),
      interests: [interest, ...(place.tags || [])].filter(Boolean),
      nearbyFocus: interest,
      visitFocus: interest,
    }).catch(() => null);
    const related = (travelBrief?.places || [])
      .filter((item) => item.name !== place.name)
      .slice(0, 5);

    placeInput.value = place.name;
    resultsSection.style.display = "";

    overviewCard.innerHTML = `
      <div class="exp-overview-card">
        <div class="exp-overview-img" style="background-image:url('${place.image}')"></div>
        <div class="exp-overview-body">
          <p class="eyebrow">${place.region} India · ${place.state}</p>
          <h2>${place.name}</h2>
          <p class="exp-overview-blurb">${place.blurb}</p>
          <div class="meta">${place.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
          <div class="exp-highlights">${place.highlights.map((highlight) => `<span class="exp-hl">📌 ${highlight}</span>`).join("")}</div>
          <div class="hero-actions" style="margin-top:16px">
            <a class="button button-secondary" href="${place.officialUrl || "#"}" target="_blank" rel="noreferrer">Official tourism page</a>
            <a class="button button-secondary" href="${buildGoogleMapsPlaceLink(place)}" target="_blank" rel="noreferrer">Open in Google Maps</a>
          </div>
        </div>
      </div>
    `;

    const interestData = await buildInterestData(place, interest, travelBrief).catch(() => buildLocalInterestData(place, interest, travelBrief));
    interestArea.innerHTML = buildInterestResults(place, interest, interestData);

    nearbyCard.innerHTML = `
      <p class="eyebrow">Nearby in ${place.region}</p>
      <h3>Pair with these destinations</h3>
      <div class="exp-nearby-grid">
        ${(related.length ? related : destinationPlaces.filter((item) => item.region === place.region && item.name !== place.name).slice(0, 5)).map((item) => `
          <div class="exp-nearby-item" data-place-name="${item.name}">
            <div class="exp-nearby-img" style="background-image:url('${item.image || place.image}')"></div>
            <div class="exp-nearby-info">
              <strong>${item.name}</strong>
              <span>${item.state || place.state}</span>
              <small>${item.highlights?.[0] || item.why || item.description || place.highlights[0]}</small>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    nearbyCard.querySelectorAll(".exp-nearby-item").forEach((item) => {
      item.addEventListener("click", () => {
    const nextPlace = item.dataset.placeName;
    if (!nextPlace) return;
    placeInput.value = nextPlace;
    void paint();
  });
    });

    accessCard.innerHTML = `
      <p class="eyebrow">Getting there</p>
      <h3>${place.name} access</h3>
      <ul>
        <li>Air: ${place.airport}</li>
        <li>Rail: ${place.rail}</li>
        <li>Road: ${place.road}</li>
        <li>Best season: ${season.bestMonths}</li>
        <li>${season.note}</li>
      </ul>
    `;

    phrasebookCard.innerHTML = `
      <p class="eyebrow">Local language</p>
      <h3>${phrases.language} phrases</h3>
      <div class="exp-phrases">
        ${phrases.phrases.map(([native, english]) => `<div class="exp-phrase-row"><strong>${native}</strong><span>${english}</span></div>`).join("")}
      </div>
    `;

    emergencyCard.innerHTML = `
      <p class="eyebrow">Emergency contacts</p>
      <h3>Keep these handy</h3>
      <ul>
        <li>Tourist helpline: ${emergency.tourist}</li>
        <li>Police: ${emergency.police}</li>
        <li>Ambulance: ${emergency.ambulance}</li>
        <li>${emergency.note}</li>
      </ul>
    `;

    weatherCard.innerHTML = `<div class="weather-skeleton skeleton shimmer"></div>`;
    fetchWeather(place.lat, place.lng)
      .then((weather) => {
        weatherCard.innerHTML = `
          <p class="eyebrow">Live weather</p>
          <h3>${place.name} today</h3>
          <div class="planner-memory-points">
            <div><strong>${weather.temperature}°C</strong><span>${weather.min}°-${weather.max}° range</span></div>
            <div><strong>${weather.rainChance}% rain</strong><span>${weather.verdict}</span></div>
          </div>
        `;
      })
      .catch(() => {
        weatherCard.innerHTML = `<p class="eyebrow">Live weather</p><h3>Weather unavailable</h3><p>Try again later for a destination forecast.</p>`;
      });

    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    exploreButton.textContent = "Exploring...";
    exploreButton.classList.add("is-loading");
    void paint();
    window.setTimeout(() => {
      exploreButton.textContent = "Explore Place";
      exploreButton.classList.remove("is-loading");
    }, 500);
  });

  currentTripButton?.addEventListener("click", () => {
    const current = getPlan();
    if (current?.place?.name) {
      placeInput.value = current.place.name;
    }
    void paint();
  });

  const params = new URLSearchParams(window.location.search);
  placeInput.value = params.get("place") || getPlan()?.place?.name || destinationPlaces[0].name;
  if (params.get("place")) {
    void paint();
  }
}
