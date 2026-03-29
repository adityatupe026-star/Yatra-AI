import { CITY_COORDS } from "../core/config.js";
import { destinationPlaces } from "../data/site-data.js";

export const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const formatCurrency = (value) => `Rs.${Number(value || 0).toLocaleString("en-IN")}`;

export const debounce = (fn, wait = 150) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

export const isMobile = () => window.matchMedia("(max-width: 760px)").matches;

export const formatInline = (text) => escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

export const getPlace = (name) => destinationPlaces.find((p) => p.name.toLowerCase() === String(name || "").toLowerCase()) || destinationPlaces[0];

export const findCoords = (name) => {
  const place = destinationPlaces.find((p) => p.name.toLowerCase() === String(name || "").toLowerCase());
  if (place) return [place.lat, place.lng, place.name];
  if (CITY_COORDS[name]) return [CITY_COORDS[name][0], CITY_COORDS[name][1], name];
  return [22.5937, 78.9629, name || "India"];
};

export const pluralize = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
