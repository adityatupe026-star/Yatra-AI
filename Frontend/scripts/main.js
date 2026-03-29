import { page } from "./core/config.js";
import { footer, initFooter, initHamburger, nav } from "./components/nav.js";
import { initMotion } from "./components/motion.js";
import { showToast } from "./components/toast.js";
import { homeMarkup, initHome } from "./pages/home.js";
import { destinationsMarkup, initDestinations } from "./pages/destinations.js";
import { plannerMarkup, initPlanner } from "./pages/planner.js";
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
  chat: { markup: chatMarkup, init: initChat, shell: "page-shell chat-shell" },
  explorer: { markup: explorerMarkup, init: initExplorer },
  map: { markup: mapMarkup, init: initMap },
  history: { markup: historyMarkup, init: initHistory },
  wishlist: { markup: wishlistMarkup, init: initWishlist },
  events: { markup: eventsMarkup, init: initEvents },
  about: { markup: aboutMarkup, init: initAbout },
  privacy: { markup: privacyMarkup },
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
  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
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
} catch (error) {
  document.body.innerHTML = `<main class="page-shell"><section class="section"><article class="route-card"><p class="eyebrow">Something broke</p><h2>YatraAI hit a page error</h2><p>${error?.message || "Unknown frontend error."}</p></article></section></main>`;
  showToast("A page error occurred. Refresh and try again.", "warning");
}
window.setTimeout(() => hideLoader(), 480);
