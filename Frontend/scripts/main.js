import { page } from "./core/config.js";
import { footer, initFooter, initHamburger, initShellChrome, nav } from "./components/nav.js";
import { initMotion } from "./components/motion.js";
import { showToast } from "./components/toast.js";
import { homeMarkup, initHome } from "./pages/home.js";
import { destinationsMarkup, initDestinations } from "./pages/destinations.js";
import { plannerMarkup, initPlanner } from "./pages/planner.js";
import { transletMarkup, initTranslet } from "./pages/translet.js";
import { chatMarkup, initChat } from "./pages/chat.js";
import { explorerMarkup, initExplorer } from "./pages/explorer.js";
import { mapMarkup, initMap } from "./pages/map.js";
import { historyMarkup, initHistory } from "./pages/history.js";
import { wishlistMarkup, initWishlist } from "./pages/wishlist.js";
import { eventsMarkup, initEvents } from "./pages/events.js";
import { aboutMarkup, initAbout, privacyMarkup } from "./pages/info.js";

const pages = {
  home: { markup: homeMarkup, init: initHome, shell: "page-shell full-bleed-shell" },
  destinations: { markup: destinationsMarkup, init: initDestinations },
  planner: { markup: plannerMarkup, init: initPlanner },
  translet: { markup: transletMarkup, init: initTranslet },
  chat: { markup: chatMarkup, init: initChat, shell: "page-shell chat-shell" },
  explorer: { markup: explorerMarkup, init: initExplorer },
  map: { markup: mapMarkup, init: initMap },
  history: { markup: historyMarkup, init: initHistory },
  wishlist: { markup: wishlistMarkup, init: initWishlist },
  events: { markup: eventsMarkup, init: initEvents },
  about: { markup: aboutMarkup, init: initAbout },
  privacy: { markup: privacyMarkup },
  404: {
    markup: () => `
      <section class="page-hero"><p class="eyebrow">404</p><h1>That route does not exist.</h1><p>The page may have moved, or the link may be broken. Use the home page to jump back into YatraAI.</p></section>
      <section class="section feature-grid">
        <article class="feature-card"><p class="eyebrow">Quick return</p><h3>Go back home</h3><p>Start from the homepage and jump into planning, chat or destinations from there.</p><a class="button button-primary" href="./index.html">Open Home</a></article>
        <article class="feature-card"><p class="eyebrow">Popular paths</p><h3>Jump straight in</h3><p>Planner, Explorer, Wishlist and Events are the main destinations most users need.</p><div class="hero-actions"><a class="button button-secondary" href="./planner.html">Planner</a><a class="button button-secondary" href="./explorer.html">Explorer</a><a class="button button-secondary" href="./wishlist.html">Wishlist</a></div></article>
      </section>
    `,
  },
};

function renderLoader() {
  const loader = document.createElement("div");
  loader.className = "app-loader";
  loader.innerHTML = `
    <div class="app-loader-brand">
      <span class="app-loader-mark">Y</span>
      <strong>YatraAI</strong>
      <small id="loaderTagline">India, Reimagined</small>
    </div>
    <div class="app-loader-bar"><span id="loaderBar"></span></div>
  `;
  document.body.appendChild(loader);
  const bar = loader.querySelector("#loaderBar");
  let progress = 8;
  const timer = window.setInterval(() => {
    progress = Math.min(progress + 18, 94);
    bar.style.width = `${progress}%`;
  }, 120);
  return () => {
    window.clearInterval(timer);
    bar.style.width = "100%";
    loader.classList.add("done");
    window.setTimeout(() => loader.remove(), 520);
  };
}

function registerEnhancements() {
  const cleanupKey = "yatraai.cleanup.complete";
  if (!localStorage.getItem(cleanupKey)) {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations?.().then((registrations) => {
        registrations?.forEach((registration) => registration.unregister().catch(() => {}));
      }).catch(() => {});
    }
    if ("caches" in window) {
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("yatraai-")).map((key) => caches.delete(key)))).catch(() => {});
    }
    localStorage.setItem(cleanupKey, "true");
  }

  const backToTop = document.createElement("button");
  backToTop.className = "back-to-top";
  backToTop.type = "button";
  backToTop.setAttribute("aria-label", "Back to top");
  backToTop.textContent = "Top";
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.body.appendChild(backToTop);

  const syncBackToTop = () => {
    backToTop.classList.toggle("visible", window.scrollY > 700);
  };
  window.addEventListener("scroll", syncBackToTop, { passive: true });
  syncBackToTop();

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.href.startsWith("mailto:")) return;
    if (document.startViewTransition && link.origin === window.location.origin) {
      event.preventDefault();
      document.startViewTransition(() => {
        window.location.href = link.href;
      });
    }
  });
}

function renderApp() {
  const current = pages[page] || pages.home;
  const shellClass = current.shell || "page-shell";
  document.body.innerHTML = nav() + `<main id="mainContent" class="${shellClass}">${current.markup()}</main>` + footer();
  initHamburger();
  initFooter();
  current.init?.();
  initMotion();
}

const hideLoader = renderLoader();
try {
  renderApp();
  registerEnhancements();
  initShellChrome();
} catch (error) {
  document.body.innerHTML = `<main class="page-shell"><section class="section"><article class="route-card"><p class="eyebrow">Something broke</p><h2>YatraAI hit a page error</h2><p>${error?.message || "Unknown frontend error."}</p></article></section></main>`;
  showToast("A page error occurred. Refresh and try again.", "warning");
}
window.setTimeout(() => hideLoader(), 480);
