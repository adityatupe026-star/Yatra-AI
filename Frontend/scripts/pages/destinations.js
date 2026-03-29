import { destinationPlaces, interestOptions } from "../data/site-data.js";
import { placeCard } from "../components/cards.js";
import { debounce } from "../utils/helpers.js";
import { toggleWishlist } from "../core/state.js";
import { buildGoogleMapsPlaceLink } from "../utils/travel.js";
import { showToast } from "../components/toast.js";

const compareSet = new Set();

export function destinationsMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">30 iconic places</p><h1>India destination library</h1><p>Search, filter by region, then narrow further with one interest tag. Heart places to save them to wishlist.</p></section>
    <section class="section filter-bar destination-filter-bar">
      <input id="destinationSearch" type="text" placeholder="Search a place, state or travel mood">
      <select id="regionFilter"><option value="All">All regions</option>${[...new Set(destinationPlaces.map((p) => p.region))].map((region) => `<option value="${region}">${region}</option>`).join("")}</select>
      <select id="interestFilter"><option value="All">All interests</option>${interestOptions.map((interest) => `<option value="${interest}">${interest}</option>`).join("")}</select>
    </section>
    <section class="section"><div id="comparisonPanel"></div></section>
    <section class="section"><div class="destination-grid" id="allDestinations"></div></section>
  `;
}

export function initDestinations() {
  const search = document.getElementById("destinationSearch");
  const region = document.getElementById("regionFilter");
  const interest = document.getElementById("interestFilter");
  const holder = document.getElementById("allDestinations");
  const comparePanel = document.getElementById("comparisonPanel");
  if (!search || !region || !interest || !holder) return;
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
    const interestValue = interest.value;
    const filtered = destinationPlaces.filter((place) => {
      const searchMatch = !term || `${place.name} ${place.state} ${place.region} ${place.tags.join(" ")} ${place.blurb}`.toLowerCase().includes(term);
      const regionMatch = regionValue === "All" || place.region === regionValue;
      const interestMatch = interestValue === "All" || place.tags.includes(interestValue);
      return searchMatch && regionMatch && interestMatch;
    });
    holder.innerHTML = filtered.length
      ? filtered.map(placeCard).join("")
      : `<article class="route-card empty-state"><p class="eyebrow">No match</p><h3>Try a broader filter</h3><p>Change region, clear interest, or search with a state or travel tag.</p></article>`;
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
  interest.addEventListener("change", paint);
  paintCompare();
  paint();
}
