import { getWishlist, toggleWishlist } from "../core/state.js";
import { destinationPlaces } from "../data/site-data.js";
import { formatCurrency } from "../utils/helpers.js";
import { REGION_SEASONS } from "../core/config.js";
import { showToast } from "../components/toast.js";
import { wishlistButton } from "../components/cards.js";

const compareSet = new Set();

function estimateWishlistBudget(place) {
  const baseByRegion = {
    North: [18000, 32000],
    West: [20000, 36000],
    South: [22000, 38000],
    East: [17000, 30000],
    Himalaya: [24000, 42000],
    Islands: [26000, 46000],
  };
  const [lowBase, highBase] = baseByRegion[place.region] || [18000, 32000];
  const premiumBoost = place.tags.some((tag) => ["Luxury", "Romance", "Nightlife"].includes(tag)) ? 4000 : 0;
  const adventureBoost = place.tags.some((tag) => ["Adventure", "Wildlife", "Beach"].includes(tag)) ? 2500 : 0;
  return { low: lowBase + premiumBoost, high: highBase + premiumBoost + adventureBoost };
}

function renderWishlistCard(place) {
  const season = REGION_SEASONS[place.region] || REGION_SEASONS.North;
  const budget = estimateWishlistBudget(place);
  return `
    <article class="route-card wishlist-card reveal-on-scroll">
      <div class="wishlist-card-head">
        <p class="eyebrow">${place.region} · ${place.state}</p>
        <label class="wishlist-compare-label">
          <input class="wishlist-compare-checkbox" type="checkbox" data-compare="${place.name}" ${compareSet.has(place.name) ? "checked" : ""}>
          <span>Compare</span>
        </label>
      </div>
      <h3>${place.name}</h3>
      <p>${place.blurb}</p>
      <div class="meta">${place.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
      <div class="wishlist-card-summary">
        <div><strong>Budget</strong><span>${formatCurrency(budget.low)} to ${formatCurrency(budget.high)}</span></div>
        <div><strong>Best season</strong><span>${season.bestMonths}</span></div>
      </div>
      <div class="wishlist-card-actions">
        ${wishlistButton(place.name)}
        <a class="button button-secondary" href="./explorer.html?place=${encodeURIComponent(place.name)}">Explore</a>
        <a class="button button-primary" href="./planner.html?destination=${encodeURIComponent(place.name)}">Plan this trip</a>
      </div>
    </article>
  `;
}

function renderComparePanel(comparePanel) {
  const places = destinationPlaces.filter((place) => compareSet.has(place.name));
  comparePanel.innerHTML = places.length >= 2
    ? `<article class="workflow-card"><p class="eyebrow">Comparison mode</p><h3>Compare destinations side by side</h3><div class="transport-step-grid compare-grid">${places.map((place) => {
        const season = REGION_SEASONS[place.region] || REGION_SEASONS.North;
        const budget = estimateWishlistBudget(place);
        return `<div class="transport-step-card"><strong>${place.name}</strong><p>Budget estimate: ${formatCurrency(budget.low)} to ${formatCurrency(budget.high)}</p><p>Best season: ${season.bestMonths}</p><p>Highlights: ${place.highlights.slice(0, 2).join(", ")}</p></div>`;
      }).join("")}</div></article>`
    : "";
}

export function wishlistMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">Wishlist</p><h1>Shortlist before you commit</h1><p>Heart destinations across the site, review them here, then jump into planner or explorer when you are ready.</p></section>
    <section class="section">
      <div class="section-head">
        <div><p class="eyebrow">Saved picks</p><h2>Your destination shortlist</h2></div>
        <a class="button button-secondary" href="./destinations.html">Browse more destinations</a>
      </div>
      <div id="wishlistComparePanel"></div>
      <div class="route-grid" id="wishlistGrid"></div>
    </section>
  `;
}

export function initWishlist() {
  const holder = document.getElementById("wishlistGrid");
  const comparePanel = document.getElementById("wishlistComparePanel");
  const paint = () => {
    const wishlist = new Set(getWishlist());
    const places = destinationPlaces.filter((place) => wishlist.has(place.name));
    holder.innerHTML = places.length
      ? places.map(renderWishlistCard).join("")
      : `<article class="route-card empty-state"><div class="empty-illustration" aria-hidden="true"><svg viewBox="0 0 120 120"><path d="M60 100s-28-18-40-36c-8-12-6-28 6-36 11-8 25-5 34 4 9-9 23-12 34-4 12 8 14 24 6 36-12 18-40 36-40 36z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"></path></svg></div><p class="eyebrow">Wishlist is empty</p><h3>Heart places from the destination library</h3><p>Use the heart buttons on cards to build a shortlist here.</p></article>`;
    holder.querySelectorAll(".reveal-on-scroll").forEach((item) => item.classList.add("is-visible"));
    holder.querySelectorAll(".wishlist-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        toggleWishlist(button.dataset.place);
        compareSet.delete(button.dataset.place);
        showToast(`${button.dataset.place} removed from wishlist.`, "default");
        paint();
      });
    });
    holder.querySelectorAll(".wishlist-compare-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const placeName = checkbox.dataset.compare;
        if (!placeName) return;
        if (checkbox.checked) {
          if (compareSet.size >= 3) {
            checkbox.checked = false;
            showToast("Compare mode supports up to 3 destinations.", "warning");
            return;
          }
          compareSet.add(placeName);
        } else {
          compareSet.delete(placeName);
        }
        renderComparePanel(comparePanel);
      });
    });
    renderComparePanel(comparePanel);
  };
  paint();
}
