import { getPlan, getPlanHistory } from "../core/state.js";
import { encodeSharePlan } from "../utils/travel.js";

export function historyMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">Saved plans</p><h1>Trip history</h1><p>Every time you start a new trip, the current plan is saved here.</p></section>
    <section class="section">
      <div class="section-head">
        <div><p class="eyebrow">Saved trips</p><h2>Sort and search your archives</h2></div>
        <div class="events-view-toggle">
          <input id="historySearch" type="text" placeholder="Search city, destination or vibe">
          <select id="historySort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>
      <div class="history-list" id="historyList"></div>
    </section>
  `;
}

export function initHistory() {
  const current = getPlan();
  const history = getPlanHistory();
  const list = document.getElementById("historyList");
  const search = document.getElementById("historySearch");
  const sort = document.getElementById("historySort");

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const sorted = [...history].sort((a, b) => {
      const aTime = Number(a.createdAtTs || Date.parse(a.createdAt || "") || 0);
      const bTime = Number(b.createdAtTs || Date.parse(b.createdAt || "") || 0);
      return sort.value === "oldest" ? aTime - bTime : bTime - aTime;
    });
    const filtered = sorted.filter((item) => {
      const haystack = `${item.start} ${item.place?.name} ${item.place?.state} ${item.mode} ${(item.interests || []).join(" ")} ${item.vibe || ""}`.toLowerCase();
      return !query || haystack.includes(query);
    });
    const currentCard = current ? `<article class="route-card"><p class="eyebrow">Current trip</p><h3>${current.start} to ${current.place.name}</h3><p>${current.mode} · ${current.days} days · Rs.${current.budget}</p><p>Saved at ${current.createdAt}</p><a class="button button-secondary" href="./planner.html?trip=${encodeURIComponent(encodeSharePlan(current))}">Restore this plan</a></article>` : "";
    const emptyState = `<article class="route-card empty-state"><div class="empty-illustration" aria-hidden="true"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="42" fill="none" stroke="currentColor" stroke-width="4" opacity="0.2"></circle><path d="M35 64l16 16 34-34" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></path></svg></div><p class="eyebrow">No saved trips yet</p><h3>Your history will appear here</h3><p>Generate a plan, then tap Start New Trip to archive it here.</p></article>`;
    list.innerHTML = currentCard + (filtered.length
      ? filtered.map((item) => `<article class="route-card"><p class="eyebrow">Saved trip</p><h3>${item.start} to ${item.place.name}</h3><p>${item.mode} · ${item.days} days · Rs.${item.budget}</p><p>${(item.interests || []).join(", ")}</p><p>Saved at ${item.createdAt}</p><a class="button button-secondary" href="./planner.html?trip=${encodeURIComponent(encodeSharePlan(item))}">Restore this plan</a></article>`).join("")
      : emptyState);
  };

  search.addEventListener("input", render);
  sort.addEventListener("change", render);
  render();
}
