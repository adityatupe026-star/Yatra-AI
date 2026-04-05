import { GOOGLE_TRANSLATE_INDIAN_LANGUAGE_CODES } from "../core/config.js";

const STORAGE_KEY = "yatraai.googleTranslate.language";
const COOKIE_NAME = "googtrans";
const DEFAULT_LANGUAGE = "en";
const GOOGLE_SCRIPT_ID = "google-translate-script";

function writeCookie(name, value) {
  document.cookie = `${name}=${value};path=/`;
}

function readCookie(name) {
  const prefix = `${name}=`;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) || "";
}

export function getPersistedGoogleLanguage() {
  return window.localStorage.getItem(STORAGE_KEY) || readCookie(COOKIE_NAME).split("/").pop() || DEFAULT_LANGUAGE;
}

export function setPersistedGoogleLanguage(language) {
  const normalized = language || DEFAULT_LANGUAGE;
  window.localStorage.setItem(STORAGE_KEY, normalized);
  if (normalized === DEFAULT_LANGUAGE) {
    writeCookie(COOKIE_NAME, `/en/${DEFAULT_LANGUAGE}`);
    return;
  }
  writeCookie(COOKIE_NAME, `/en/${normalized}`);
}

function ensureGoogleCallback() {
  if (typeof window.googleTranslateElementInit === "function") return;
  window.googleTranslateElementInit = () => {
    window.dispatchEvent(new CustomEvent("yatraai:googleTranslateReady"));
  };
}

function loadGoogleScript() {
  if (document.getElementById(GOOGLE_SCRIPT_ID)) return;
  ensureGoogleCallback();
  const script = document.createElement("script");
  script.id = GOOGLE_SCRIPT_ID;
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.head.appendChild(script);
}

function mountWidget(hostId) {
  const host = document.getElementById(hostId);
  if (!host || !window.google?.translate?.TranslateElement) return false;
  host.innerHTML = "";
  new window.google.translate.TranslateElement(
    {
      pageLanguage: DEFAULT_LANGUAGE,
      includedLanguages: GOOGLE_TRANSLATE_INDIAN_LANGUAGE_CODES,
      layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
    },
    hostId,
  );
  return true;
}

function applySelectedLanguage(hostId, language) {
  const host = document.getElementById(hostId);
  if (!host) return false;
  const combo = host.querySelector(".goog-te-combo");
  if (!combo) return false;
  combo.value = language;
  combo.dispatchEvent(new Event("change"));
  return true;
}

export function bootstrapGoogleTranslatePersistence() {
  const language = getPersistedGoogleLanguage();
  if (language === DEFAULT_LANGUAGE) return;

  writeCookie(COOKIE_NAME, `/en/${language}`);

  let host = document.getElementById("google_translate_persist_host");
  if (!host) {
    host = document.createElement("div");
    host.id = "google_translate_persist_host";
    host.setAttribute("aria-hidden", "true");
    host.style.position = "absolute";
    host.style.left = "-9999px";
    host.style.top = "0";
    host.style.width = "1px";
    host.style.height = "1px";
    host.style.overflow = "hidden";
    document.body.appendChild(host);
  }

  loadGoogleScript();

  const tryMount = () => mountWidget(host.id);
  if (!tryMount()) {
    window.addEventListener("yatraai:googleTranslateReady", tryMount, { once: true });
  }

  let attempts = 0;
  const retry = window.setInterval(() => {
    attempts += 1;
    if (applySelectedLanguage(host.id, language) || attempts > 20) {
      window.clearInterval(retry);
    }
  }, 250);
}

export function initGoogleTranslateWidget(hostId) {
  const host = document.getElementById(hostId);
  if (!host) return;

  loadGoogleScript();

  const attach = () => {
    if (!mountWidget(hostId)) return false;
    host.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || !target.classList.contains("goog-te-combo")) return;
      const lang = target.value || DEFAULT_LANGUAGE;
      setPersistedGoogleLanguage(lang);
    }, true);
    return true;
  };

  if (!attach()) {
    window.addEventListener("yatraai:googleTranslateReady", attach, { once: true });
  }
}
