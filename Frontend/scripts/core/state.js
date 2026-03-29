import { KEYS } from "./config.js";

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const getPlan = () => readJson(KEYS.currentPlan, null);
export const setPlan = (plan) => writeJson(KEYS.currentPlan, plan);
export const getPlanHistory = () => readJson(KEYS.planHistory, []);
export const setPlanHistory = (items) => writeJson(KEYS.planHistory, items);
export const getChats = () => readJson(KEYS.chatSessions, []);
export const setChats = (items) => writeJson(KEYS.chatSessions, items);
export const getChatId = () => localStorage.getItem(KEYS.currentChatId);
export const setChatId = (id) => localStorage.setItem(KEYS.currentChatId, id);
export const getWishlist = () => readJson(KEYS.wishlist, []);
export const setWishlist = (items) => writeJson(KEYS.wishlist, items);
export const isWishlisted = (name) => getWishlist().includes(name);
export const toggleWishlist = (name) => {
  const current = new Set(getWishlist());
  if (current.has(name)) current.delete(name);
  else current.add(name);
  const next = Array.from(current);
  setWishlist(next);
  return next;
};

export function archiveCurrentPlan() {
  const current = getPlan();
  if (!current) return;
  const items = getPlanHistory();
  items.unshift(current);
  setPlanHistory(items.slice(0, 25));
  localStorage.removeItem(KEYS.currentPlan);
}
