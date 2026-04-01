import { destinationPlaces, interestOptions } from "../data/site-data.js";
import { REGION_SEASONS } from "../core/config.js";
import { placeCard } from "../components/cards.js";
import { debounce } from "../utils/helpers.js";
import { toggleWishlist } from "../core/state.js";
import { buildGoogleMapsPlaceLink } from "../utils/travel.js";
import { showToast } from "../components/toast.js";

const compareSet = new Set();
const REGION_SEASON_MAP = {
  North: ["Winter"],
  West: ["Winter"],
  South: ["Winter", "Monsoon"],
  East: ["Winter", "Summer"],
  Himalaya: ["Summer"],
  Islands: ["Winter"],
};

function getSeasonLabel(region) {
  const season = REGION_SEASONS[region];
  if (!season) return "Winter";
  const months = `${season.bestMonths} ${season.note}`.toLowerCase();
  if (months.includes("june") || months.includes("july") || months.includes("august") || months.includes("september")) return "Monsoon";
  if (months.includes("march") || months.includes("april") || months.includes("may")) return "Summer";
  return "Winter";
}

export function destinationsMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">30 iconic places</p><h1>India destination library</h1><p>Search, filter by region, then narrow further with one interest tag. Heart places to save them to wishlist.</p></section>
    <section class="section filter-bar destination-filter-bar">
      <input id="destinationSearch" type="text" placeholder="Search a place, state or travel mood">
      <select id="regionFilter"><option value="All">All regions</option>${[...new Set(destinationPlaces.map((p) => p.region))].map((region) => `<option value="${region}">${region}</option>`).join("")}</select>
      <select id="seasonFilter"><option value="All">All Seasons</option><option value="Winter">Winter (Oct-Feb)</option><option value="Summer">Summer (Mar-May)</option><option value="Monsoon">Monsoon (Jun-Sep)</option></select>
      <select id="interestFilter"><option value="All">All interests</option>${interestOptions.map((interest) => `<option value="${interest}">${interest}</option>`).join("")}</select>
      <button class="button button-secondary" type="button" id="clearDestinationFilters">Clear Filters</button>
    </section>
    <section class="section"><div id="comparisonPanel"></div></section>
    <section class="section"><div class="destination-grid" id="allDestinations"></div></section>
  `;
}

export function initDestinations() {
  const search = document.getElementById("destinationSearch");
  const region = document.getElementById("regionFilter");
  const season = document.getElementById("seasonFilter");
  const interest = document.getElementById("interestFilter");
  const clearButton = document.getElementById("clearDestinationFilters");
  const holder = document.getElementById("allDestinations");
  const comparePanel = document.getElementById("comparisonPanel");
  if (!search || !region || !season || !interest || !clearButton || !holder) return;
  holder.innerHTML = Array.from({ length: 6 }, () => `<div class="route-card skeleton shimmer" style="height:360px"></div>`).join("");

  const paintCompare = () => {
    const places = destinationPlaces.filter((place) => compareSet.has(place.name));
    comparePanel.innerHTML = places.length
      ? `<article class="workflow-card"><p class="eyebrow">Comparison mode</p><h3>Compare destinations side by side</h3><div class="transport-step-grid compare-grid">${places.map((place) => `<div class="transport-step-card"><strong>${place.name}</strong><p>Best season: ${place.region}</p><p>Highlights: ${place.highlights.slice(0, 2).join(", ")}</p><p>Tags: ${place.tags.slice(0, 2).join(", ")}</p><a class="inline-link" href="${buildGoogleMapsPlaceLink(place)}" target="_blank" rel="noreferrer">Open in Google Maps</a></div>`).join("")}</div></article>`
      : "";
  };

  const paint = () => {
    const term = search.value.trim().toLowerCase();
    const regionValue = region.value;
    const seasonValue = season.value;
    const interestValue = interest.value;
    const filtered = destinationPlaces.filter((place) => {
      const searchMatch = !term || `${place.name} ${place.state} ${place.region} ${place.tags.join(" ")} ${place.blurb}`.toLowerCase().includes(term);
      const regionMatch = regionValue === "All" || place.region === regionValue;
      const seasonMatch = seasonValue === "All" || (REGION_SEASON_MAP[place.region] || [getSeasonLabel(place.region)]).includes(seasonValue);
      const interestMatch = interestValue === "All" || place.tags.includes(interestValue);
      return searchMatch && regionMatch && seasonMatch && interestMatch;
    });
    holder.innerHTML = filtered.length
      ? filtered.map(placeCard).join("")
      : `<article class="route-card empty-state"><div class="empty-illustration" aria-hidden="true"><svg viewBox="0 0 120 120"><path d="M24 86h72" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"></path><path d="M40 78l20-34 16 26 8-12" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="48" cy="44" r="8" fill="none" stroke="currentColor" stroke-width="5"></circle></svg></div><p class="eyebrow">No match</p><h3>Try a broader filter</h3><p>Change region, clear interest, or search with a state or travel tag.</p></article>`;
    holder.querySelectorAll(".reveal-on-scroll").forEach((item) => item.classList.add("is-visible"));
    holder.querySelectorAll(".wishlist-toggle").forEach((button) => {
      if (button.dataset.place) {
        button.addEventListener("click", () => {
          toggleWishlist(button.dataset.place);
          showToast(`${button.dataset.place} wishlist updated.`, "success");
          paint();
        });
      }
      if (button.dataset.compare) {
        button.addEventListener("click", () => {
          if (compareSet.has(button.dataset.compare)) compareSet.delete(button.dataset.compare);
          else if (compareSet.size < 3) compareSet.add(button.dataset.compare);
          else showToast("Compare mode supports up to 3 destinations.", "warning");
          showToast(`${button.dataset.compare} updated in comparison mode.`, "default");
          paintCompare();
        });
      }
    });
  };

  const debouncedPaint = debounce(paint, 120);
  search.addEventListener("input", debouncedPaint);
  region.addEventListener("change", paint);
  season.addEventListener("change", paint);
  interest.addEventListener("change", paint);
  clearButton.addEventListener("click", () => {
    search.value = "";
    region.value = "All";
    season.value = "All";
    interest.value = "All";
    paint();
    showToast("Destination filters cleared.", "default");
  });
  paintCompare();
  paint();
}
