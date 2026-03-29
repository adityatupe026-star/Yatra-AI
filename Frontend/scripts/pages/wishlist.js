import { getWishlist, toggleWishlist } from "../core/state.js";
import { destinationPlaces } from "../data/site-data.js";
import { wishlistCard } from "../components/cards.js";
import { showToast } from "../components/toast.js";

export function wishlistMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">Wishlist</p><h1>Shortlist before you commit</h1><p>Heart destinations across the site, review them here, then jump into planner or explorer when you are ready.</p></section>
    <section class="section">
      <div class="section-head">
        <div><p class="eyebrow">Saved picks</p><h2>Your destination shortlist</h2></div>
        <a class="button button-secondary" href="./destinations.html">Browse more destinations</a>
      </div>
      <div class="route-grid" id="wishlistGrid"></div>
    </section>
  `;
}

export function initWishlist() {
  const holder = document.getElementById("wishlistGrid");
  const paint = () => {
    const wishlist = new Set(getWishlist());
    const places = destinationPlaces.filter((place) => wishlist.has(place.name));
    holder.innerHTML = places.length
      ? places.map(wishlistCard).join("")
      : `<article class="route-card empty-state"><p class="eyebrow">Wishlist is empty</p><h3>Heart places from the destination library</h3><p>Use the heart buttons on cards to build a shortlist here.</p></article>`;
    holder.querySelectorAll(".reveal-on-scroll").forEach((item) => item.classList.add("is-visible"));
    holder.querySelectorAll(".wishlist-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        toggleWishlist(button.dataset.place);
        showToast(`${button.dataset.place} removed from wishlist.`, "default");
        paint();
      });
    });
  };
  paint();
}
