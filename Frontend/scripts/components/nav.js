import { MAIN_NAV_ITEMS, MORE_NAV_ITEMS, page } from "../core/config.js";
import { showToast } from "./toast.js";

export function nav() {
  const moreActive = MORE_NAV_ITEMS.some(([key]) => page === key);
  return `
    <a class="skip-link" href="#mainContent">Skip to content</a>
    <header class="topbar">
      <a class="brand" href="./index.html"><span class="brand-mark">Y</span><span><strong>YatraAI</strong><small>India, Reimagined</small></span></a>
      <button class="hamburger" id="navHamburger" type="button" aria-label="Open navigation">
        <span></span><span></span><span></span>
      </button>
      <nav class="nav">
        ${MAIN_NAV_ITEMS.map(([key, href, label]) => `<a class="nav-link ${page === key ? "active" : ""}" href="${href}">${label}</a>`).join("")}
        <details class="nav-more">
          <summary class="nav-link nav-more-summary ${moreActive ? "active" : ""}">More</summary>
          <div class="nav-more-menu">
            ${MORE_NAV_ITEMS.map(([key, href, label]) => `<a class="nav-more-link ${page === key ? "active" : ""}" href="${href}">${label}</a>`).join("")}
          </div>
        </details>
      </nav>
      <a class="nav-cta ${page === "planner" ? "active" : ""}" href="./planner.html"><span class="nav-cta-icon">GO</span><span>Plan a Trip</span></a>
      <div class="mobile-drawer" id="mobileDrawer">
        <div class="mobile-drawer-panel">
          <div class="mobile-drawer-head">
            <strong>YatraAI</strong>
            <button class="drawer-close" id="drawerClose" type="button" aria-label="Close navigation">X</button>
          </div>
          <nav class="mobile-nav">
            ${MAIN_NAV_ITEMS.map(([key, href, label]) => `<a class="mobile-nav-link ${page === key ? "active" : ""}" href="${href}">${label}</a>`).join("")}
            <details class="mobile-more">
              <summary class="mobile-nav-link ${moreActive ? "active" : ""}">More</summary>
              <div class="mobile-more-list">
                ${MORE_NAV_ITEMS.map(([key, href, label]) => `<a class="mobile-nav-link mobile-more-link ${page === key ? "active" : ""}" href="${href}">${label}</a>`).join("")}
              </div>
            </details>
          </nav>
        </div>
      </div>
    </header>
    <nav class="mobile-bottom-nav" aria-label="Quick navigation">
      <a class="mobile-bottom-link ${page === "home" ? "active" : ""}" href="./index.html">Home</a>
      <a class="mobile-bottom-link ${page === "explorer" ? "active" : ""}" href="./explorer.html">Explorer</a>
      <a class="mobile-bottom-link ${page === "chat" ? "active" : ""}" href="./chat.html">Chat</a>
      <a class="mobile-bottom-link ${page === "wishlist" ? "active" : ""}" href="./wishlist.html">Wishlist</a>
    </nav>
  `;
}

export function footer() {
  return `
    <footer class="site-footer">
      <div class="footer-grid">
        <div>
          <p class="eyebrow">YatraAI</p>
          <h3>Travel planning for India with memory, maps and local detail.</h3>
          <p>Built with Ollama, modular frontend architecture, curated destination data and practical planning tools for real trips.</p>
        </div>
        <div>
          <p class="eyebrow">Explore</p>
          <div class="footer-links">
            <a href="./destinations.html">Destinations</a>
            <a href="./events.html">Events</a>
            <a href="./planner.html">Trip Planner</a>
            <a href="./wishlist.html">Wishlist</a>
          </div>
        </div>
        <div>
          <p class="eyebrow">Company</p>
          <div class="footer-links">
            <a href="./about.html">About</a>
            <a href="./privacy.html">Privacy Policy</a>
            <a href="mailto:hello@yatraai.in">Contact</a>
          </div>
        </div>
        <div>
          <p class="eyebrow">Stay in touch</p>
          <form class="newsletter-form" id="newsletterForm">
            <input id="newsletterEmail" type="email" placeholder="Enter your email" aria-label="Email for updates">
            <button class="button button-secondary" type="submit">Join</button>
          </form>
          <div class="footer-socials">
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
        </div>
      </div>
      <div class="footer-credit">Made with love for India</div>
    </footer>
  `;
}

export function initHamburger() {
  const trigger = document.getElementById("navHamburger");
  const drawer = document.getElementById("mobileDrawer");
  const close = document.getElementById("drawerClose");
  if (!trigger || !drawer || !close) return;
  const open = () => drawer.classList.add("open");
  const shut = () => drawer.classList.remove("open");
  trigger.addEventListener("click", open);
  close.addEventListener("click", shut);
  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) shut();
  });
}

export function initShellChrome() {
  const bannerId = "offlineBanner";
  const ensureBanner = () => {
    let banner = document.getElementById(bannerId);
    if (navigator.onLine) {
      banner?.remove();
      return;
    }
    if (!banner) {
      banner = document.createElement("div");
      banner.id = bannerId;
      banner.className = "offline-banner";
      banner.innerHTML = `<strong>Offline</strong><span>You can keep browsing saved content.</span>`;
      document.body.appendChild(banner);
    }
  };
  ensureBanner();
  window.addEventListener("online", ensureBanner);
  window.addEventListener("offline", ensureBanner);
}

export function initFooter() {
  const form = document.getElementById("newsletterForm");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("newsletterEmail");
    if (!email?.value.trim()) {
      showToast("Enter an email to join updates.", "warning");
      return;
    }
    email.value = "";
    showToast("Thanks, you are on the YatraAI updates list.", "success");
  });
}

