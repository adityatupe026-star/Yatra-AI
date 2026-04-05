import { partnerFilterLabel, partnerInboxStats, PARTNER_REQUESTS, partnerRequestCard } from "../data/partner-inbox-data.js";
import { showToast } from "../components/toast.js";

const REQUESTED_KEY = "yatraai.partnerInbox.requested";

let activeFilter = "all";
let activeSort = "newest";
let searchQuery = "";
let connectTarget = null;
let requested = new Set();

function loadRequested() {
  try {
    const raw = window.localStorage.getItem(REQUESTED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveRequested() {
  try {
    window.localStorage.setItem(REQUESTED_KEY, JSON.stringify([...requested]));
  } catch {
    // Ignore storage failures.
  }
}

function filteredRequests() {
  let list = [...PARTNER_REQUESTS];
  if (activeFilter !== "all") {
    list = list.filter((request) => request.type === activeFilter || request.pref === activeFilter);
  }
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    list = list.filter((request) => (
      request.name.toLowerCase().includes(query)
      || request.from.toLowerCase().includes(query)
      || request.to.toLowerCase().includes(query)
      || request.note.toLowerCase().includes(query)
      || request.interests.some((item) => item.toLowerCase().includes(query))
    ));
  }
  if (activeSort === "days_asc") return list.sort((a, b) => a.days - b.days);
  if (activeSort === "days_desc") return list.sort((a, b) => b.days - a.days);
  return list;
}

function renderList() {
  const grid = document.getElementById("piGrid");
  if (!grid) return;
  const list = filteredRequests();
  if (!list.length) {
    grid.innerHTML = `
      <div class="pi-empty">
        <div class="pi-empty-icon">🔍</div>
        <h3>No requests found</h3>
        <p>Try a different filter or search term.</p>
      </div>
    `;
    return;
  }
  grid.innerHTML = list.map((request) => partnerRequestCard(request, { requested: requested.has(request.id) })).join("");
  grid.querySelectorAll(".pi-connect-btn:not([disabled])").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      connectTarget = PARTNER_REQUESTS.find((request) => request.id === id) || null;
      openConnectModal();
    });
  });
}

function openConnectModal() {
  const overlay = document.getElementById("piModalOverlay");
  if (!overlay || !connectTarget) return;
  document.getElementById("piModalTitle").textContent = `Connect with ${connectTarget.name}`;
  document.getElementById("piModalSub").textContent = `${connectTarget.from} → ${connectTarget.to} · ${connectTarget.days} days`;
  document.getElementById("piModalForm").hidden = false;
  document.getElementById("piModalSuccess").hidden = true;
  document.getElementById("piConnectName").value = "";
  document.getElementById("piConnectContact").value = "";
  document.getElementById("piConnectMsg").value = "";
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeConnectModal() {
  document.getElementById("piModalOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
}

function buildPageHTML() {
  const stats = partnerInboxStats();
  const featured = PARTNER_REQUESTS.slice(0, 4).map((request) => partnerRequestCard(request, { requested: requested.has(request.id), compact: true })).join("");
  return `
    <section class="pi-hero-frame">
      <div class="pi-hero">
        <div class="pi-hero-eyebrow">Travel Partner Inbox</div>
        <h1>Find your next travel partner</h1>
        <p>Browse open travel requests, match by route and trip style, and send a connection request in a few clicks.</p>
        <div class="pi-hero-stats">
          <div class="pi-stat"><strong id="piStatTotal">${stats.total}</strong><span>Open requests</span></div>
          <div class="pi-stat"><strong id="piStatNew">${stats.newRequests}</strong><span>New today</span></div>
          <div class="pi-stat"><strong id="piStatCities">${stats.destinations}</strong><span>Destinations</span></div>
        </div>
      </div>
      <div class="pi-hero-side">
        <div class="pi-hero-card">
          <p class="eyebrow">How it works</p>
          <ol class="pi-steps">
            <li><strong>1</strong><span>Filter by solo, group, couple or budget style.</span></li>
            <li><strong>2</strong><span>Scan cards for route, dates, interest tags and trip vibe.</span></li>
            <li><strong>3</strong><span>Send a request and start planning together.</span></li>
          </ol>
        </div>
        <div class="pi-hero-card pi-hero-highlight">
          <p class="eyebrow">Today&apos;s focus</p>
          <h3>Fast route matching</h3>
          <p>We highlight people already heading to the same destination so the inbox stays simple and useful.</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Featured inbox</p>
          <h2>Recent requests you can join</h2>
        </div>
        <a class="button button-secondary" href="./index.html#partnerInboxSection">See on home</a>
      </div>
      <div class="partner-preview-grid partner-preview-grid-framed">
        ${featured}
      </div>
    </section>

    <section class="section">
      <div class="pi-frame-note">
        <strong>Reading tip:</strong>
        <span>Each card shows the route first, then the trip mood and interest tags so you can compare people quickly.</span>
      </div>
      <div class="pi-toolbar">
        <div class="pi-filters">
          <button class="pi-filter-btn active" data-filter="all">All (${stats.total})</button>
          <button class="pi-filter-btn" data-filter="solo">${partnerFilterLabel("solo")}</button>
          <button class="pi-filter-btn" data-filter="group">${partnerFilterLabel("group")}</button>
          <button class="pi-filter-btn" data-filter="couple">${partnerFilterLabel("couple")}</button>
          <button class="pi-filter-btn" data-filter="budget">${partnerFilterLabel("budget")}</button>
          <button class="pi-filter-btn" data-filter="best">${partnerFilterLabel("best")}</button>
          <button class="pi-filter-btn" data-filter="luxury">${partnerFilterLabel("luxury")}</button>
        </div>
        <div class="pi-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input class="pi-search" id="piSearch" type="text" placeholder="Search destination, interest or traveler">
        </div>
      </div>
      <div class="pi-sort-bar">
        <span class="pi-sort-label">Sort:</span>
        <button class="pi-sort-btn active" data-sort="newest">Newest first</button>
        <button class="pi-sort-btn" data-sort="days_asc">Shortest trip</button>
        <button class="pi-sort-btn" data-sort="days_desc">Longest trip</button>
      </div>
      <div class="pi-grid-shell">
        <div class="pi-grid" id="piGrid"></div>
      </div>
    </section>
  `;
}

function buildModalHTML() {
  return `
    <div class="pi-modal-overlay" id="piModalOverlay">
      <div class="pi-modal">
        <button class="pi-modal-close" id="piModalClose" type="button" aria-label="Close">×</button>
        <span class="pi-modal-icon">🤝</span>
        <h2 id="piModalTitle">Connect</h2>
        <p class="pi-modal-sub" id="piModalSub"></p>
        <div id="piModalForm">
          <div class="pi-modal-field">
            <label>Your name *</label>
            <input id="piConnectName" type="text" placeholder="Full name" autocomplete="name">
          </div>
          <div class="pi-modal-field">
            <label>Contact *</label>
            <input id="piConnectContact" type="text" placeholder="WhatsApp or email" autocomplete="email">
          </div>
          <div class="pi-modal-field">
            <label>Message</label>
            <textarea id="piConnectMsg" placeholder="Tell them a bit about yourself and why you would be a great travel companion..."></textarea>
          </div>
          <button class="pi-modal-send" id="piModalSend" type="button">Send connection request</button>
        </div>
        <div class="pi-modal-success" id="piModalSuccess" hidden>
          <span class="pi-modal-success-icon">🎉</span>
          <h3>Request sent</h3>
          <p>Your connection request has been shared. Start planning your trip together.</p>
          <button class="pi-connect-btn sent" style="margin:0 auto;display:block" type="button" id="piSuccessClose">Done</button>
        </div>
      </div>
    </div>
  `;
}

export function partnerInboxMarkup() {
  return buildPageHTML();
}

export function initPartnerInbox() {
  requested = loadRequested();
  if (!document.getElementById("piModalOverlay")) {
    document.body.insertAdjacentHTML("beforeend", buildModalHTML());
  }
  renderList();

  document.querySelectorAll(".pi-filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".pi-filter-btn").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      activeFilter = button.dataset.filter || "all";
      renderList();
    });
  });

  document.querySelectorAll(".pi-sort-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".pi-sort-btn").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      activeSort = button.dataset.sort || "newest";
      renderList();
    });
  });

  document.getElementById("piSearch")?.addEventListener("input", (event) => {
    searchQuery = event.target.value.trim();
    renderList();
  });

  document.getElementById("piModalClose")?.addEventListener("click", closeConnectModal);
  document.getElementById("piSuccessClose")?.addEventListener("click", closeConnectModal);
  document.getElementById("piModalOverlay")?.addEventListener("click", (event) => {
    if (event.target?.id === "piModalOverlay") closeConnectModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeConnectModal();
  });

  document.getElementById("piModalSend")?.addEventListener("click", () => {
    const name = document.getElementById("piConnectName")?.value.trim();
    const contact = document.getElementById("piConnectContact")?.value.trim();
    if (!name || !contact) {
      showToast("Please fill your name and contact.", "warning");
      return;
    }
    if (connectTarget) {
      requested.add(connectTarget.id);
      saveRequested();
      renderList();
    }
    document.getElementById("piModalForm").hidden = true;
    document.getElementById("piModalSuccess").hidden = false;
    showToast("Connection request sent.", "success");
  });
}
