import { destinationPlaces } from "../data/site-data.js";

export function mapMarkup() {
  return `<section class="page-hero"><p class="eyebrow">YatraAI map</p><h1>30 featured places, marked</h1><p>Use the map to scan where each destination sits before planning a route.</p></section><section class="section"><div id="indiaMap" class="map-shell"></div><div class="map-link-bar"><a class="button button-secondary" href="https://www.google.com/maps/search/?api=1&query=India+tourist+destinations" target="_blank" rel="noreferrer">Open all destinations in Google Maps</a></div></section>`;
}

export function initMap() {
  if (typeof L === "undefined") return;
  const map = L.map("indiaMap", { zoomControl: true }).setView([22.5, 79.5], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  destinationPlaces.forEach((place) => {
    L.circleMarker([place.lat, place.lng], {
      radius: 6,
      color: "#f3c76b",
      weight: 2,
      fillColor: "#c8942e",
      fillOpacity: 0.9,
    }).addTo(map).bindPopup(`<strong>${place.name}</strong><br>${place.state}<br><a href="${place.officialUrl}" target="_blank" rel="noreferrer">Official tourism page</a>`);
  });
}
