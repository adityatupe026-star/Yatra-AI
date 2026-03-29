import { majorEvents } from "../data/site-data.js";
import { eventCard } from "../components/cards.js";

export function eventsMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">Top 10 major events</p><h1>Festival and event calendar</h1><p>Use this page to discover India's biggest culture, faith and seasonal travel events before you build your itinerary.</p></section>
    <section class="section">
      <div class="section-head">
        <div><p class="eyebrow">Major moments</p><h2>Plan around crowd-pulling events</h2></div>
        <a class="inline-link" href="./planner.html">Turn an event into a trip</a>
      </div>
      <div class="event-grid" id="eventsGrid"></div>
    </section>
  `;
}

export function initEvents() {
  const grid = document.getElementById("eventsGrid");
  grid.innerHTML = Array.from({ length: 4 }, () => `<div class="route-card skeleton shimmer" style="height:320px"></div>`).join("");
  window.setTimeout(() => {
    grid.innerHTML = majorEvents.map((event, index) => eventCard(event, index)).join("");
    grid.querySelectorAll(".reveal-on-scroll").forEach((item) => item.classList.add("is-visible"));
  }, 220);
}
