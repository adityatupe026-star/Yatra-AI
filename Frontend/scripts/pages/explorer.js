import { EMERGENCY_CONTACTS, REGION_SEASONS, STATE_PHRASES } from "../core/config.js";
import { getPlan } from "../core/state.js";
import { destinationPlaces, interestOptions } from "../data/site-data.js";
import { buildGoogleMapsPlaceLink } from "../utils/travel.js";
import { fetchWeather } from "../utils/weather.js";

export function explorerMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">Explorer</p><h1>Nearby picks and place overviews</h1><p>Write any featured place name and see a detailed overview, season note, access breakdown and nearby route pairings.</p></section>
    <section class="section planner-layout single-top">
      <div class="ai-console">
        <form class="quick-planner" id="explorerSearchForm">
          <div class="quick-grid">
            <label>Write place name<input id="explorerPlaceInput" list="explorerPlaceSuggestions" type="text" placeholder="Jaipur, Goa, Varanasi, Munnar"></label>
            <label>Interest focus<select id="explorerInterest">${interestOptions.map((interest) => `<option value="${interest}">${interest}</option>`).join("")}</select></label>
          </div>
          <div class="hero-actions planner-actions">
            <button class="button button-primary" id="explorePlaceButton" type="submit">Explore Place</button>
            <button class="button button-secondary" type="button" id="explorerUseCurrentTrip">Use Current Trip Place</button>
          </div>
          <datalist id="explorerPlaceSuggestions">${destinationPlaces.map((p) => `<option value="${p.name}"></option>`).join("")}</datalist>
        </form>
      </div>
      <aside class="planner-sidebar">
        <article class="sidebar-card">
          <p class="eyebrow">Explorer tips</p>
          <h3>Type a place instead of selecting</h3>
          <p>Explorer now adds seasonal fit by region, practical access notes and nearby pairings before you commit to a route.</p>
        </article>
      </aside>
    </section>
    <section class="section explorer-grid explorer-grid-detailed">
      <article class="sidebar-card explorer-overview-card" id="overviewCard"></article>
      <article class="sidebar-card" id="accessCard"></article>
      <article class="sidebar-card" id="nearbyCard"></article>
    </section>
    <section class="section feature-grid">
      <article class="sidebar-card" id="explorerWeatherCard"><div class="weather-skeleton skeleton shimmer"></div></article>
      <article class="sidebar-card" id="phrasebookCard"></article>
      <article class="sidebar-card" id="emergencyCard"></article>
    </section>
  `;
}

export function initExplorer() {
  const searchForm = document.getElementById("explorerSearchForm");
  const placeInput = document.getElementById("explorerPlaceInput");
  const interestSelect = document.getElementById("explorerInterest");
  const overview = document.getElementById("overviewCard");
  const access = document.getElementById("accessCard");
  const nearby = document.getElementById("nearbyCard");
  const weatherCard = document.getElementById("explorerWeatherCard");
  const phrasebookCard = document.getElementById("phrasebookCard");
  const emergencyCard = document.getElementById("emergencyCard");
  const exploreButton = document.getElementById("explorePlaceButton");
  if (!searchForm || !placeInput || !interestSelect) return;

  const resolvePlace = () => {
    const raw = (placeInput.value || "").trim().toLowerCase();
    return destinationPlaces.find((item) => item.name.toLowerCase() === raw)
      || destinationPlaces.find((item) => item.name.toLowerCase().includes(raw))
      || destinationPlaces.find((item) => item.state.toLowerCase().includes(raw))
      || getPlan()?.place
      || destinationPlaces[0];
  };

  const paint = () => {
    const place = resolvePlace();
    const season = REGION_SEASONS[place.region] || REGION_SEASONS.North;
    const phrasebook = STATE_PHRASES[place.state] || STATE_PHRASES.Rajasthan;
    const emergency = EMERGENCY_CONTACTS[place.state] || EMERGENCY_CONTACTS.default;
    const related = destinationPlaces.filter((item) => item.region === place.region && item.name !== place.name).slice(0, 4);
    const currentInterest = interestSelect.value;
    placeInput.value = place.name;
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
        <div class="hero-actions">
          <a class="button button-secondary" href="${place.officialUrl}" target="_blank" rel="noreferrer">Official tourism page</a>
          <a class="button button-secondary" href="${buildGoogleMapsPlaceLink(place)}" target="_blank" rel="noreferrer">Open in Google Maps</a>
        </div>
      </div>
    `;
    access.innerHTML = `
      <p class="eyebrow">Access + season</p>
      <h3>${place.name} logistics</h3>
      <ul>
        <li>Air access: ${place.airport}</li>
        <li>Rail access: ${place.rail}</li>
        <li>Road access: ${place.road}</li>
        <li>Best season window: ${season.bestMonths}</li>
        <li>Region mood: ${season.mood}</li>
        <li>Planning note: ${season.note}</li>
      </ul>
    `;
    nearby.innerHTML = `
      <p class="eyebrow">Nearby style picks</p>
      <h3>${place.region} circuit</h3>
      <p>${related.map((item) => item.name).join(", ")} pair well with ${place.name} for a broader route.</p>
      <ul>${related.map((item) => `<li><strong>${item.name}</strong>: ${item.blurb} Highlights: ${item.highlights.join(", ")}.</li>`).join("")}</ul>
    `;
    phrasebookCard.innerHTML = `<p class="eyebrow">Local phrasebook</p><h3>${phrasebook.language} travel phrases</h3><ul>${phrasebook.phrases.map(([native, english]) => `<li><strong>${native}</strong>: ${english}</li>`).join("")}</ul>`;
    emergencyCard.innerHTML = `<p class="eyebrow">Emergency contacts</p><h3>Keep these numbers handy</h3><ul><li>Tourist helpline: ${emergency.tourist}</li><li>Police: ${emergency.police}</li><li>Ambulance: ${emergency.ambulance}</li><li>${emergency.note}</li></ul>`;
    weatherCard.innerHTML = `<div class="weather-skeleton skeleton shimmer"></div>`;
    fetchWeather(place.lat, place.lng).then((weather) => {
      weatherCard.innerHTML = `<p class="eyebrow">Live weather</p><h3>${place.name} forecast</h3><ul><li>Temperature: ${weather.temperature}°C</li><li>Rain chance: ${weather.rainChance}%</li><li>Verdict: ${weather.verdict}</li></ul>`;
    }).catch(() => {
      weatherCard.innerHTML = `<p class="eyebrow">Live weather</p><h3>Weather unavailable</h3><p>Try again later for a destination forecast.</p>`;
    });
  };

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (exploreButton) {
      exploreButton.textContent = "Exploring...";
      exploreButton.classList.add("is-loading");
    }
    paint();
    window.setTimeout(() => {
      if (!exploreButton) return;
      exploreButton.textContent = "Explore Place";
      exploreButton.classList.remove("is-loading");
    }, 420);
  });
  document.getElementById("explorerUseCurrentTrip").addEventListener("click", () => {
    if (exploreButton) {
      exploreButton.textContent = "Exploring...";
      exploreButton.classList.add("is-loading");
    }
    const current = getPlan();
    if (current?.place?.name) placeInput.value = current.place.name;
    paint();
    window.setTimeout(() => {
      if (!exploreButton) return;
      exploreButton.textContent = "Explore Place";
      exploreButton.classList.remove("is-loading");
    }, 420);
  });
  placeInput.addEventListener("change", paint);
  interestSelect.addEventListener("change", paint);
  const params = new URLSearchParams(window.location.search);
  placeInput.value = params.get("place") || getPlan()?.place?.name || destinationPlaces[0].name;
  paint();
}
