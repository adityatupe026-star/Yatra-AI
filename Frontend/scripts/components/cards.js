import { isWishlisted } from "../core/state.js";
import { formatCurrency } from "../utils/helpers.js";

export function wishlistButton(placeName) {
  const active = isWishlisted(placeName);
  return `<button class="wishlist-toggle ${active ? "active" : ""}" data-place="${placeName}" type="button" aria-label="Toggle wishlist for ${placeName}">${active ? "♥" : "♡"}</button>`;
}

export function placeCard(place) {
  return `
    <article class="destination-card reveal-on-scroll">
      <div class="destination-media" style="background-image:url('${place.image}')"></div>
      <div class="destination-card-tools">${wishlistButton(place.name)}<button class="wishlist-toggle compare-toggle" data-compare="${place.name}" type="button" aria-label="Compare ${place.name}">⇄</button></div>
      <div class="destination-copy">
        <p class="eyebrow">${place.region} · ${place.state}</p>
        <h3>${place.name}</h3>
        <p>${place.blurb}</p>
        <div class="meta">${place.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        <a class="inline-link" href="${place.officialUrl}" target="_blank" rel="noreferrer">Official tourism page</a>
      </div>
    </article>
  `;
}

export function miniPlaceCard(place, tone = "") {
  return `
    <article class="mini-destination-card ${tone} reveal-on-scroll">
      <div class="mini-destination-media" style="background-image:url('${place.image}')"></div>
      <div class="mini-destination-copy">
        <p class="eyebrow">${place.region} · ${place.state}</p>
        <h3>${place.name}</h3>
        <p>${place.blurb}</p>
        <div class="meta">${place.tags.slice(0, 3).map((tag) => `<span>${tag}</span>`).join("")}</div>
      </div>
    </article>
  `;
}

export function routeSpotlightCard(route, lead, index) {
  return `
    <article class="route-spotlight-card reveal-on-scroll">
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

export function eventCard(event, index) {
  return `
    <article class="event-card ${index === 0 ? "event-card-featured" : ""} reveal-on-scroll">
      <div class="event-card-media" style="background-image:url('${event.image}')"></div>
      <div class="event-card-copy">
        <p class="eyebrow">${event.type}</p>
        <h3>${event.name}</h3>
        <p>${event.blurb}</p>
        <div class="meta"><span>${event.location}</span><span>${event.timing}</span></div>
      </div>
    </article>
  `;
}

export function statBlock(label, value, detail) {
  return `<div class="stat-block reveal-on-scroll"><strong class="counter" data-counter="${value}">0</strong><span>${label}</span><small>${detail}</small></div>`;
}

export function wishlistCard(place) {
  return `
    <article class="route-card wishlist-card reveal-on-scroll">
      <div class="wishlist-card-head">
        <p class="eyebrow">${place.region} · ${place.state}</p>
        ${wishlistButton(place.name)}
      </div>
      <h3>${place.name}</h3>
      <p>${place.blurb}</p>
      <div class="meta">${place.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
      <div class="wishlist-card-actions">
        <a class="button button-secondary" href="./explorer.html?place=${encodeURIComponent(place.name)}">Explore</a>
        <a class="button button-primary" href="./planner.html?destination=${encodeURIComponent(place.name)}">Plan this trip</a>
      </div>
    </article>
  `;
}

export function budgetCard(label, range, detail) {
  return `<article class="route-card budget-card reveal-on-scroll"><p class="eyebrow">${label}</p><h3>${range}</h3><p>${detail}</p></article>`;
}
