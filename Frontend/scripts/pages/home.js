import { HOME_SLIDES } from "../core/config.js";
import { destinationPlaces, featuredRoutes } from "../data/site-data.js";
import { miniPlaceCard, routeSpotlightCard, statBlock } from "../components/cards.js";
import { PARTNER_REQUESTS, partnerInboxStats, partnerRequestCard } from "../data/partner-inbox-data.js";

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
          <button class="btn-find-partner btn-find-partner-hero" id="findPartnerBtn" type="button">
            <span class="btn-fp-glow"></span>
            <span class="btn-fp-inner">
              <span class="btn-fp-icon">🤝</span>
              <span class="btn-fp-text">
                <strong>Find Travel Partner</strong>
              </span>
            </span>
          </button>
          <a class="button button-secondary" href="./wishlist.html">Build wishlist</a>
          <a class="button button-secondary" href="./chat.html">Open Yatra AI</a>
          <a class="button button-secondary" href="./explorer.html" id="surpriseMeButton">Surprise me</a>
        </div>
        <div class="hero-meta hero-stats">
          ${statBlock("Destinations", 30, "Curated places across India")}
          ${statBlock("Travel modes", 3, "Air, road and train planning")}
          ${statBlock("Major events", 10, "Festival-led travel moments")}
        </div>
        <p class="hero-swipe-hint">Swipe the hero image to switch stories</p>
      </div>
      <aside class="planner-card">
        <p class="eyebrow">Quick jump</p>
        <h2>Choose the kind of trip first.</h2>
        <div class="quick-links-grid compact-grid">
          ${spotlightPlaces.map((place, index) => miniPlaceCard(place, index === 0 ? "wide" : "")).join("")}
        </div>
        <div class="partner-cta-wrap">
          <button class="btn-find-partner" id="findPartnerBtnCard" type="button">
            <span class="btn-fp-glow"></span>
            <span class="btn-fp-inner">
              <span class="btn-fp-icon">🤝</span>
              <span class="btn-fp-text">
                <strong>Find a Travel Partner</strong>
                <small>Connect with travellers on your route</small>
              </span>
              <span class="btn-fp-arrow">→</span>
            </span>
          </button>
        </div>
      </aside>

      <!-- Travel Partner Modal -->
      <div class="partner-modal-overlay" id="partnerModalOverlay" role="dialog" aria-modal="true" aria-label="Find Travel Partner">
        <div class="partner-modal">
          <button class="partner-modal-close" id="partnerModalClose" type="button" aria-label="Close">✕</button>

          <div class="partner-modal-header">
            <div class="partner-modal-badge">✈️ Travel Matching</div>
            <h2>Find Your Perfect<br><span class="partner-heading-highlight">Travel Partner</span></h2>
            <p>Tell us about your trip and we'll connect you with fellow travellers heading the same way.</p>
          </div>

          <!-- Initial Choice Screen -->
          <div class="partner-modal-body" id="partnerChoiceScreen">
            <div class="partner-field">
              <label>Choose your travel type</label>
              <div class="partner-type-grid">
                <button type="button" class="partner-type-card" id="soloTravelerBtn">
                  <span class="type-icon">👤</span>
                  <strong>Solo Traveler</strong>
                  <small>Find companions for your journey</small>
                </button>
                <button type="button" class="partner-type-card" id="groupTravelerBtn">
                  <span class="type-icon">👥</span>
                  <strong>Group Traveler</strong>
                  <small>Find partners for group travel</small>
                </button>
              </div>
            </div>
          </div>

          <!-- Solo Traveler Form -->
          <div class="partner-modal-body" id="soloTravelerForm" hidden>

            <!-- Route row -->
            <div class="partner-route-row">
              <div class="partner-field">
                <label for="partnerFrom">📍 Travelling From</label>
                <input type="text" id="partnerFrom" placeholder="Your city or origin" autocomplete="off" />
              </div>
              <div class="partner-route-arrow">→</div>
              <div class="partner-field">
                <label for="partnerTo">🏁 Destination</label>
                <input type="text" id="partnerTo" placeholder="e.g. Leh, Goa, Jaipur…" autocomplete="off" />
              </div>
            </div>

            <!-- Days slider -->
            <div class="partner-field partner-days-field">
              <label>🗓️ How many days? <span class="partner-days-value" id="partnerDaysVal">7 days</span></label>
              <div class="partner-slider-wrap">
                <input type="range" id="partnerDays" min="1" max="30" value="7" class="partner-slider" />
                <div class="partner-slider-labels">
                  <span>1 day</span><span>1 week</span><span>2 weeks</span><span>1 month</span>
                </div>
              </div>
            </div>

            <!-- Trip preference cards -->
            <div class="partner-field">
              <label>🎯 Trip Preference</label>
              <div class="partner-pref-grid">
                <button type="button" class="partner-pref-card" data-pref="budget">
                  <span class="pref-icon">🎒</span>
                  <strong>Budget Travel</strong>
                  <small>Backpacker friendly,<br>spend less see more</small>
                </button>
                <button type="button" class="partner-pref-card" data-pref="best">
                  <span class="pref-icon">⭐</span>
                  <strong>Best Experience</strong>
                  <small>Balanced comfort,<br>memorable moments</small>
                </button>
                <button type="button" class="partner-pref-card" data-pref="luxury">
                  <span class="pref-icon">💎</span>
                  <strong>Luxury</strong>
                  <small>Premium stays,<br>curated experiences</small>
                </button>
              </div>
            </div>

          </div>

          <!-- Group Traveler Form -->
          <div class="partner-modal-body" id="groupTravelerForm" hidden>

            <!-- Route row -->
            <div class="partner-route-row">
              <div class="partner-field">
                <label for="groupFrom">📍 Travelling From</label>
                <input type="text" id="groupFrom" placeholder="Your city or origin" autocomplete="off" />
              </div>
              <div class="partner-route-arrow">→</div>
              <div class="partner-field">
                <label for="groupTo">🏁 Destination</label>
                <input type="text" id="groupTo" placeholder="e.g. Leh, Goa, Jaipur…" autocomplete="off" />
              </div>
            </div>

            <!-- Number of partners -->
            <div class="partner-field">
              <label for="groupPartners">👥 How many partners do you want?</label>
              <input type="number" id="groupPartners" min="1" max="10" value="2" placeholder="Number of travel partners" />
            </div>

            <!-- Days slider -->
            <div class="partner-field partner-days-field">
              <label>🗓️ No. of days to stay <span class="partner-days-value" id="groupDaysVal">7 days</span></label>
              <div class="partner-slider-wrap">
                <input type="range" id="groupDays" min="1" max="30" value="7" class="partner-slider" />
                <div class="partner-slider-labels">
                  <span>1 day</span><span>1 week</span><span>2 weeks</span><span>1 month</span>
                </div>
              </div>
            </div>

            <!-- Trip preference cards -->
            <div class="partner-field">
              <label>🎯 Experience</label>
              <div class="partner-pref-grid">
                <button type="button" class="partner-pref-card group-pref-card" data-pref="budget">
                  <span class="pref-icon">🎒</span>
                  <strong>Budget Travel</strong>
                  <small>Backpacker friendly,<br>spend less see more</small>
                </button>
                <button type="button" class="partner-pref-card group-pref-card" data-pref="best">
                  <span class="pref-icon">⭐</span>
                  <strong>Best Experience</strong>
                  <small>Balanced comfort,<br>memorable moments</small>
                </button>
                <button type="button" class="partner-pref-card group-pref-card" data-pref="luxury">
                  <span class="pref-icon">💎</span>
                  <strong>Luxury</strong>
                  <small>Premium stays,<br>curated experiences</small>
                </button>
              </div>
            </div>

          </div>

          <div class="partner-modal-footer">
            <button class="btn-find-partner-submit" id="partnerSubmitBtn" type="button">
              <span>🔍 Find My Travel Partner</span>
            </button>
            <button class="button button-secondary" id="partnerBackBtn" type="button" hidden>
              <span>← Back</span>
            </button>
          </div>

          <div class="partner-success" id="partnerSuccess" hidden>
            <div class="partner-success-inner">
              <span class="partner-success-icon">🎉</span>
              <h3>You're on the list!</h3>
              <p>We're scanning for travellers on your route. You'll hear from us soon — start packing!</p>
              <button class="button button-secondary" id="partnerSuccessClose" type="button">Done</button>
            </div>
          </div>
        </div>
      </div>
      <div class="hero-pagination" id="homeHeroPagination"></div>
    </section>

    <!-- Mini Map Widget -->
    <div class="mini-map-widget" id="miniMapWidget">
      <a href="./map.html" class="mini-map-link" aria-label="Open India Map">
        <div class="mini-map-container">
          <div class="mini-map-outline">
            <svg viewBox="0 0 100 100" class="mini-map-svg">
              <path d="M20,10 L80,10 L80,40 L60,35 L60,60 L40,55 L40,80 L20,75 Z" fill="none" stroke="#ff6b35" stroke-width="2"/>
              <circle cx="50" cy="30" r="3" fill="#f7c948"/>
              <circle cx="35" cy="50" r="2" fill="#ff6b35"/>
              <circle cx="65" cy="45" r="2" fill="#f7c948"/>
              <circle cx="45" cy="65" r="2" fill="#ff6b35"/>
            </svg>
          </div>
          <div class="mini-map-label">
            <span class="mini-map-icon">🗺️</span>
            <span class="mini-map-text">Map</span>
          </div>
        </div>
      </a>
    </div>

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

    <section class="section partner-inbox-section" id="partnerInboxSection">
      <div class="section-head">
        <div>
          <p class="eyebrow">Travel partner inbox</p>
          <h2>Open requests from travelers heading your way</h2>
        </div>
        <a class="button button-secondary" href="./partner-inbox.html">Open inbox</a>
      </div>
      <div class="partner-inbox-stats">
        <div class="partner-inbox-stat"><strong>${partnerInboxStats().total}</strong><span>Open requests</span></div>
        <div class="partner-inbox-stat"><strong>${partnerInboxStats().newRequests}</strong><span>New today</span></div>
        <div class="partner-inbox-stat"><strong>${partnerInboxStats().destinations}</strong><span>Destinations</span></div>
      </div>
      <div class="partner-preview-grid">
        ${PARTNER_REQUESTS.slice(0, 3).map((request) => partnerRequestCard(request, { compact: true })).join("")}
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
  let touchStartX = 0;
  let touchStartY = 0;
  let timer = null;
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
  const startRotation = () => {
    timer = window.setInterval(() => sync((index + 1) % HOME_SLIDES.length), 5200);
  };
  const stopRotation = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };
  media.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });
  media.addEventListener("touchend", (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);
    if (Math.abs(deltaX) < 48 || deltaY > 70) return;
    sync((index + (deltaX < 0 ? 1 : HOME_SLIDES.length - 1)) % HOME_SLIDES.length);
  });
  media.addEventListener("mouseenter", stopRotation);
  media.addEventListener("mouseleave", startRotation);
  startRotation();
  document.getElementById("surpriseMeButton")?.addEventListener("click", (event) => {
    event.preventDefault();
    const randomPlace = destinationPlaces[Math.floor(Math.random() * destinationPlaces.length)];
    window.location.href = `./explorer.html?place=${encodeURIComponent(randomPlace.name)}`;
  });

  // Travel Partner Modal
  const overlay = document.getElementById("partnerModalOverlay");

  const openModal = () => {
    if (!overlay) return;
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    // Show choice screen initially
    showChoiceScreen();
  };

  const closeModal = () => {
    if (!overlay) return;
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    const success = document.getElementById("partnerSuccess");
    const submitBtn = document.getElementById("partnerSubmitBtn");
    const backBtn = document.getElementById("partnerBackBtn");
    const footer = document.querySelector(".partner-modal-footer");
    const header = document.querySelector(".partner-modal-header");
    if (success) success.hidden = true;
    if (submitBtn) submitBtn.hidden = false;
    if (backBtn) backBtn.hidden = true;
    if (footer) footer.hidden = false;
    if (header) header.hidden = false;
    // Reset to choice screen
    showChoiceScreen();
  };

  const showChoiceScreen = () => {
    document.getElementById("partnerChoiceScreen").hidden = false;
    document.getElementById("soloTravelerForm").hidden = true;
    document.getElementById("groupTravelerForm").hidden = true;
    document.getElementById("partnerSubmitBtn").hidden = true;
    document.getElementById("partnerBackBtn").hidden = true;
  };

  const showSoloForm = () => {
    document.getElementById("partnerChoiceScreen").hidden = true;
    document.getElementById("soloTravelerForm").hidden = false;
    document.getElementById("groupTravelerForm").hidden = true;
    document.getElementById("partnerSubmitBtn").hidden = false;
    document.getElementById("partnerBackBtn").hidden = false;
  };

  const showGroupForm = () => {
    document.getElementById("partnerChoiceScreen").hidden = true;
    document.getElementById("soloTravelerForm").hidden = true;
    document.getElementById("groupTravelerForm").hidden = false;
    document.getElementById("partnerSubmitBtn").hidden = false;
    document.getElementById("partnerBackBtn").hidden = false;
  };

  document.getElementById("findPartnerBtn")?.addEventListener("click", openModal);
  document.getElementById("findPartnerBtnCard")?.addEventListener("click", openModal);
  document.getElementById("partnerModalClose")?.addEventListener("click", closeModal);
  document.getElementById("partnerSuccessClose")?.addEventListener("click", closeModal);
  overlay?.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  // Choice screen buttons
  document.getElementById("soloTravelerBtn")?.addEventListener("click", showSoloForm);
  document.getElementById("groupTravelerBtn")?.addEventListener("click", showGroupForm);

  // Back button
  document.getElementById("partnerBackBtn")?.addEventListener("click", showChoiceScreen);

  // Days slider live label for solo traveler
  const daysInput = document.getElementById("partnerDays");
  const daysVal = document.getElementById("partnerDaysVal");
  daysInput?.addEventListener("input", () => {
    const v = Number(daysInput.value);
    daysVal.textContent = v === 1 ? "1 day" : `${v} days`;
    const pct = ((v - 1) / 29) * 100;
    daysInput.style.setProperty("--pct", pct + "%");
  });

  // Days slider live label for group traveler
  const groupDaysInput = document.getElementById("groupDays");
  const groupDaysVal = document.getElementById("groupDaysVal");
  groupDaysInput?.addEventListener("input", () => {
    const v = Number(groupDaysInput.value);
    groupDaysVal.textContent = v === 1 ? "1 day" : `${v} days`;
    const pct = ((v - 1) / 29) * 100;
    groupDaysInput.style.setProperty("--pct", pct + "%");
  });

  // Trip preference card selection for solo traveler
  document.querySelectorAll("#soloTravelerForm .partner-pref-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll("#soloTravelerForm .partner-pref-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
    });
  });

  // Trip preference card selection for group traveler
  document.querySelectorAll("#groupTravelerForm .partner-pref-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll("#groupTravelerForm .partner-pref-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
    });
  });

  // Submit
  document.getElementById("partnerSubmitBtn")?.addEventListener("click", () => {
    const soloFormVisible = !document.getElementById("soloTravelerForm").hidden;
    const groupFormVisible = !document.getElementById("groupTravelerForm").hidden;

    if (soloFormVisible) {
      // Validate solo traveler form
      const from = document.getElementById("partnerFrom")?.value.trim();
      const to = document.getElementById("partnerTo")?.value.trim();
      const pref = document.querySelector("#soloTravelerForm .partner-pref-card.selected");
      if (!from || !to) {
        const missing = !from ? "partnerFrom" : "partnerTo";
        const el = document.getElementById(missing);
        el?.classList.add("partner-field-error");
        el?.focus();
        setTimeout(() => el?.classList.remove("partner-field-error"), 1800);
        return;
      }
      if (!pref) {
        document.querySelector("#soloTravelerForm .partner-pref-grid")?.classList.add("partner-pref-shake");
        setTimeout(() => document.querySelector("#soloTravelerForm .partner-pref-grid")?.classList.remove("partner-pref-shake"), 600);
        return;
      }
    } else if (groupFormVisible) {
      // Validate group traveler form
      const from = document.getElementById("groupFrom")?.value.trim();
      const to = document.getElementById("groupTo")?.value.trim();
      const partners = document.getElementById("groupPartners")?.value.trim();
      const pref = document.querySelector("#groupTravelerForm .partner-pref-card.selected");
      if (!from || !to) {
        const missing = !from ? "groupFrom" : "groupTo";
        const el = document.getElementById(missing);
        el?.classList.add("partner-field-error");
        el?.focus();
        setTimeout(() => el?.classList.remove("partner-field-error"), 1800);
        return;
      }
      if (!partners || parseInt(partners) < 1) {
        const el = document.getElementById("groupPartners");
        el?.classList.add("partner-field-error");
        el?.focus();
        setTimeout(() => el?.classList.remove("partner-field-error"), 1800);
        return;
      }
      if (!pref) {
        document.querySelector("#groupTravelerForm .partner-pref-grid")?.classList.add("partner-pref-shake");
        setTimeout(() => document.querySelector("#groupTravelerForm .partner-pref-grid")?.classList.remove("partner-pref-shake"), 600);
        return;
      }
    }

    // Show success
    const visibleBody = document.querySelector(".partner-modal-body:not([hidden])");
    if (visibleBody) visibleBody.hidden = true;
    document.querySelector(".partner-modal-footer").hidden = true;
    document.querySelector(".partner-modal-header").hidden = true;
    document.getElementById("partnerSuccess").hidden = false;
  });

  // Mini Map Widget - only show on home page
  const miniMapWidget = document.getElementById("miniMapWidget");
  if (miniMapWidget) {
    if (document.body.dataset.page === "home") {
      miniMapWidget.style.display = "block";
    } else {
      miniMapWidget.style.display = "none";
    }
  }
}
