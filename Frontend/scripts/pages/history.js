import { getPlan, getPlanHistory } from "../core/state.js";

export function historyMarkup() {
  return `<section class="page-hero"><p class="eyebrow">Saved plans</p><h1>Trip history</h1><p>Every time you start a new trip, the current plan is saved here.</p></section><section class="section"><div class="history-list" id="historyList"></div></section>`;
}

export function initHistory() {
  const current = getPlan();
  const history = getPlanHistory();
  document.getElementById("historyList").innerHTML =
    (current ? `<article class="route-card"><p class="eyebrow">Current trip</p><h3>${current.start} to ${current.place.name}</h3><p>${current.mode} · ${current.days} days · Rs.${current.budget}</p><p>Saved at ${current.createdAt}</p></article>` : "") +
    (history.length
      ? history.map((item) => `<article class="route-card"><p class="eyebrow">Saved trip</p><h3>${item.start} to ${item.place.name}</h3><p>${item.mode} · ${item.days} days · Rs.${item.budget}</p><p>${(item.interests || []).join(", ")}</p><p>Saved at ${item.createdAt}</p></article>`).join("")
      : `<article class="route-card empty-state"><p class="eyebrow">No saved trips yet</p><h3>Your history will appear here</h3><p>Generate a plan, then tap Start New Trip to archive it here.</p></article>`);
}
