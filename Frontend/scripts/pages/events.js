import { majorEvents } from "../data/site-data.js";
import { eventCard } from "../components/cards.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthIndexesFromTiming(timing) {
  const text = (timing || "").toLowerCase();
  if (text.includes("rotational")) return MONTHS.map((_, index) => index);
  return MONTHS.reduce((indexes, month, index) => {
    if (text.includes(month.toLowerCase())) indexes.push(index);
    return indexes;
  }, []);
}

function renderCalendar() {
  const buckets = MONTHS.map(() => []);
  majorEvents.forEach((event) => {
    const indexes = monthIndexesFromTiming(event.timing);
    if (!indexes.length) return;
    indexes.forEach((index) => buckets[index].push(event));
  });
  return `<div class="events-calendar">${MONTHS.map((month, index) => `<article class="cal-month"><h4>${month}</h4>${buckets[index].length ? buckets[index].map((event) => `<span class="cal-event-chip"><strong>${event.name}</strong><br>${event.location}</span>`).join("") : `<p class="section-note">No major events listed.</p>`}</article>`).join("")}</div>`;
}

export function eventsMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">Top 10 major events</p><h1>Festival and event calendar</h1><p>Use this page to discover India's biggest culture, faith and seasonal travel events before you build your itinerary.</p></section>
    <section class="section">
      <div class="section-head events-toolbar">
        <div><p class="eyebrow">Major moments</p><h2>Plan around crowd-pulling events</h2></div>
        <div class="events-view-toggle">
          <button class="button button-secondary is-active" type="button" id="eventsGridViewButton">Grid</button>
          <button class="button button-secondary" type="button" id="eventsCalendarViewButton">Calendar</button>
        </div>
      </div>
      <div class="event-grid" id="eventsGrid"></div>
    </section>
  `;
}

export function initEvents() {
  const grid = document.getElementById("eventsGrid");
  const gridButton = document.getElementById("eventsGridViewButton");
  const calendarButton = document.getElementById("eventsCalendarViewButton");
  grid.innerHTML = Array.from({ length: 4 }, () => `<div class="route-card skeleton shimmer" style="height:320px"></div>`).join("");
  const setView = (view) => {
    const isCalendar = view === "calendar";
    gridButton.classList.toggle("is-active", !isCalendar);
    calendarButton.classList.toggle("is-active", isCalendar);
    grid.innerHTML = isCalendar ? renderCalendar() : majorEvents.map((event, index) => eventCard(event, index)).join("");
    grid.querySelectorAll(".reveal-on-scroll").forEach((item) => item.classList.add("is-visible"));
  };
  window.setTimeout(() => {
    setView("grid");
  }, 220);
  gridButton.addEventListener("click", () => setView("grid"));
  calendarButton.addEventListener("click", () => setView("calendar"));
}
