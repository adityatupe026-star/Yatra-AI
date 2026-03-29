import { HOME_SLIDES } from "../core/config.js";
import { destinationPlaces, featuredRoutes } from "../data/site-data.js";
import { miniPlaceCard, routeSpotlightCard, statBlock } from "../components/cards.js";

export function homeMarkup() {
  const spotlightPlaces = ["Jaipur", "Goa", "Leh", "Alappuzha"].map((name) => destinationPlaces.find((place) => place.name === name));
  return `
    <section class="hero legacy-hero">
      <div class="hero-media hero-parallax" id="homeHeroMedia" style="background-image:url('${HOME_SLIDES[0][2]}')"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <p class="eyebrow">India, reimagined</p>
        <h1 id="homeHeroTitle">${HOME_SLIDES[0][0]}</h1>
        <p class="hero-copy" id="homeHeroCopy">${HOME_SLIDES[0][1]}</p>
        <div class="hero-actions">
          <a class="button button-primary" href="./planner.html?new=1">Start planning</a>
          <a class="button button-secondary" href="./wishlist.html">Build wishlist</a>
          <a class="button button-secondary" href="./chat.html">Open Yatra AI</a>
        </div>
        <div class="hero-meta hero-stats">
          ${statBlock("Destinations", 30, "Curated places across India")}
          ${statBlock("Travel modes", 3, "Air, road and train planning")}
          ${statBlock("Major events", 10, "Festival-led travel moments")}
        </div>
      </div>
      <aside class="planner-card">
        <p class="eyebrow">Quick jump</p>
        <h2>Choose the kind of trip first.</h2>
        <div class="quick-links-grid compact-grid">
          ${spotlightPlaces.map((place, index) => miniPlaceCard(place, index === 0 ? "wide" : "")).join("")}
        </div>
      </aside>
      <div class="hero-pagination" id="homeHeroPagination"></div>
    </section>
    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Featured routes</p>
          <h2>Travel stories that already feel planned</h2>
        </div>
        <p class="section-note">Start with a mood, then open planner, explorer or Yatra AI when you want detail.</p>
      </div>
      <div class="route-spotlight-grid">
        ${featuredRoutes.map((route, index) => routeSpotlightCard(route, destinationPlaces.find((place) => place.name === route.places[0]), index)).join("")}
      </div>
    </section>
    <section class="section story-section">
      <div class="feature-grid">
        <a class="feature-card" href="./destinations.html"><h3>Browse destinations</h3><p>Use a three-way filter and shortlist the places that fit your vibe.</p></a>
        <a class="feature-card" href="./planner.html"><h3>Plan trip</h3><p>Route builder with dining-aware suggestions, map output and workflow cards.</p></a>
        <a class="feature-card" href="./explorer.html"><h3>Explorer + seasons</h3><p>Type a place and get an overview, logistics, season notes and nearby pairings.</p></a>
        <a class="feature-card" href="./wishlist.html"><h3>Wishlist mode</h3><p>Heart destinations, compare them later and turn any shortlist into a trip.</p></a>
      </div>
    </section>
  `;
}

export function initHome() {
  const media = document.getElementById("homeHeroMedia");
  const title = document.getElementById("homeHeroTitle");
  const copy = document.getElementById("homeHeroCopy");
  const pager = document.getElementById("homeHeroPagination");
  if (!media || !title || !copy || !pager) return;
  let index = 0;
  pager.innerHTML = HOME_SLIDES.map((_, slideIndex) => `<button class="hero-dot ${slideIndex === 0 ? "active" : ""}" type="button" data-slide="${slideIndex}"></button>`).join("");
  const sync = (nextIndex) => {
    index = nextIndex;
    media.classList.add("hero-media-fading");
    title.textContent = HOME_SLIDES[index][0];
    copy.textContent = HOME_SLIDES[index][1];
    window.setTimeout(() => {
      media.style.backgroundImage = `url('${HOME_SLIDES[index][2]}')`;
      media.classList.remove("hero-media-fading");
    }, 180);
    pager.querySelectorAll(".hero-dot").forEach((dot) => dot.classList.toggle("active", Number(dot.dataset.slide) === index));
  };
  pager.addEventListener("click", (event) => {
    const button = event.target.closest(".hero-dot");
    if (!button) return;
    sync(Number(button.dataset.slide));
  });
  window.setInterval(() => sync((index + 1) % HOME_SLIDES.length), 5200);
}
