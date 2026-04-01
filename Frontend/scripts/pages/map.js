import { destinationPlaces } from "../data/site-data.js";

export function mapMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">YatraAI map</p><h1>30 featured places, marked</h1><p>Use the map to scan where each destination sits before planning a route.</p></section>
    <section class="section map-layout">
      <aside class="sidebar-card map-sidebar">
        <p class="eyebrow">All places</p>
        <h3>Hover a destination</h3>
        <p>Each item highlights its marker so you can move from list to geography quickly.</p>
        <div class="map-place-list" id="mapPlaceList"></div>
      </aside>
      <div>
        <div id="indiaMap" class="map-shell"></div>
        <div class="map-link-bar"><a class="button button-secondary" href="https://www.google.com/maps/search/?api=1&query=India+tourist+destinations" target="_blank" rel="noreferrer">Open all destinations in Google Maps</a></div>
      </div>
    </section>`;
}

export function initMap() {
  if (typeof L === "undefined") return;
  const placeList = document.getElementById("mapPlaceList");
  const map = L.map("indiaMap", { zoomControl: true }).setView([22.5, 79.5], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  const markers = {};
  destinationPlaces.forEach((place) => {
    markers[place.name] = L.circleMarker([place.lat, place.lng], {
      radius: 6,
      color: "#f3c76b",
      weight: 2,
      fillColor: "#c8942e",
      fillOpacity: 0.9,
    }).addTo(map).bindPopup(`<strong>${place.name}</strong><br>${place.state}<br><a href="${place.officialUrl}" target="_blank" rel="noreferrer">Official tourism page</a>`);
  });
  if (placeList) {
    placeList.innerHTML = destinationPlaces.map((place) => `<button class="map-place-item" type="button" data-place="${place.name}"><strong>${place.name}</strong><span>${place.state} · ${place.region}</span></button>`).join("");
    placeList.querySelectorAll(".map-place-item").forEach((item) => {
      item.addEventListener("mouseenter", () => {
        const marker = markers[item.dataset.place];
        if (!marker) return;
        marker.openPopup();
        map.panTo(marker.getLatLng(), { animate: true });
      });
      item.addEventListener("click", () => {
        const marker = markers[item.dataset.place];
        if (!marker) return;
        marker.openPopup();
        map.panTo(marker.getLatLng(), { animate: true });
      });
    });
  }
}
