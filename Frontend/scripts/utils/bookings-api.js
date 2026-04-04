import { API_CONFIG } from "../core/config.js";

async function postJson(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response.json();
}

export async function summarizeHotelBooking(hotel, destination) {
  const data = await postJson(API_CONFIG.bookingSummaryEndpoint, { hotel, destination });
  if (data?.summary) return data.summary;
  throw new Error("Hotel summary unavailable from backend.");
}

export async function confirmBooking(payload) {
  const data = await postJson(API_CONFIG.bookingConfirmEndpoint, payload);
  if (data?.reference) return data;
  throw new Error("Booking confirmation unavailable from backend.");
}
