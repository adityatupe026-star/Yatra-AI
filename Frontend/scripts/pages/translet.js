import { API_CONFIG, TRANSLATE_LANGUAGES } from "../core/config.js";
import { showToast } from "../components/toast.js";
import { speakText } from "../utils/speech.js";
import { bootstrapGoogleTranslatePersistence, initGoogleTranslateWidget } from "../utils/google-translate.js";

const RECENT_KEY = "yatraai.translet.recent";
const TARGET_KEY = "yatraai.translet.target";
const MAX_RECENT = 5;

const SAMPLE_PHRASES = [
  { label: "Hello", text: "Hello, can you help me?" },
  { label: "Food", text: "Where can I get local food?" },
  { label: "Transport", text: "How do I reach the station?" },
  { label: "Check-in", text: "I have a booking for tonight." },
  { label: "Emergency", text: "I need help right now." },
];

function encodeData(value) {
  return encodeURIComponent(value || "");
}

function decodeData(value) {
  try {
    return decodeURIComponent(value || "");
  } catch {
    return value || "";
  }
}

function languageLabel(code) {
  return TRANSLATE_LANGUAGES.find(([itemCode]) => itemCode === code)?.[1] || code;
}

function languageOptions(selectedCode) {
  return TRANSLATE_LANGUAGES
    .filter(([code]) => code !== "auto")
    .map(([code, label]) => `<option value="${code}" ${code === selectedCode ? "selected" : ""}>${label}</option>`)
    .join("");
}

function loadRecentTranslations() {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentTranslations(items) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    // Ignore storage failures in private mode or restricted browsers.
  }
}

function pushRecentTranslation(entry) {
  const recent = loadRecentTranslations().filter((item) => item?.input !== entry.input || item?.target !== entry.target || item?.translated !== entry.translated);
  recent.unshift({ ...entry, createdAt: Date.now() });
  saveRecentTranslations(recent);
  return recent.slice(0, MAX_RECENT);
}

async function translateText(text, target) {
  const response = await fetch(API_CONFIG.apiTranslateEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Translation failed.");
  }
  return data.translated ?? text;
}

function renderRecentList(holder, recent) {
  if (!holder) return;
  if (!recent.length) {
    holder.innerHTML = `
      <article class="translet-recent-item translet-empty">
        <strong>No recent translations yet</strong>
        <p>Your last few translations will appear here for quick reuse.</p>
      </article>
    `;
    return;
  }

  holder.innerHTML = recent
    .map((item) => `
      <button class="translet-recent-item" type="button" data-input="${encodeData(item.input)}" data-target="${encodeData(item.target)}">
        <strong>${languageLabel(item.target)}</strong>
        <p>${item.input}</p>
        <span>${item.translated}</span>
      </button>
    `)
    .join("");
}

export function transletMarkup() {
  const targetOptions = languageOptions("hi");
  const sampleChips = SAMPLE_PHRASES
    .map((item) => `<button class="translet-chip" type="button" data-sample="${encodeData(item.text)}"><span>${item.label}</span><small>${item.text}</small></button>`)
    .join("");

  return `
    <section class="page-hero translet-hero">
      <div class="translet-hero-copy">
        <p class="eyebrow">Translation studio</p>
        <h1>Turn travel phrases into local language, fast</h1>
        <p>Write a message, choose a target language, and send it through the Python backend. The page also keeps the Google Translate widget handy for quick page-level switching.</p>
        <div class="translet-hero-pills">
          <span class="translet-pill">Backend powered</span>
          <span class="translet-pill">Travel phrases</span>
          <span class="translet-pill">Google widget</span>
        </div>
      </div>
      <article class="translet-hero-card">
        <p class="eyebrow">How it works</p>
        <h3>Built for real travel moments</h3>
        <div class="translet-hero-stats">
          <div><strong>1</strong><span>Paste a phrase</span></div>
          <div><strong>2</strong><span>Choose a target</span></div>
          <div><strong>3</strong><span>Hit translate</span></div>
          <div><strong>5</strong><span>Saved recent items</span></div>
        </div>
      </article>
    </section>

    <section class="section translet-layout single-top">
      <div class="translet-main">
        <article class="translet-card translet-compose-card">
          <div class="planner-section-head translet-head">
            <div>
              <p class="eyebrow">Compose</p>
              <h3>Translate a message into another Indian language</h3>
            </div>
            <p class="section-note">The backend expects {"text": "...", "target": "hi"} and returns translated text from the Python API.</p>
          </div>

          <form id="transletForm" class="translet-form">
            <label class="translet-field">
              <span>Text to translate</span>
              <textarea id="transletInput" rows="7" placeholder="Type or paste a sentence, phrase, or travel note"></textarea>
            </label>

            <div class="translet-chip-row" aria-label="Sample phrases">
              ${sampleChips}
            </div>

            <div class="translet-controls">
              <label>
                <span>Source</span>
                <select id="transletSource" disabled>
                  <option value="auto" selected>Auto detect</option>
                </select>
              </label>
              <label>
                <span>Target</span>
                <select id="transletTarget">${targetOptions}</select>
              </label>
            </div>

            <div class="hero-actions translet-actions">
              <button class="button button-primary" type="submit">Translate</button>
              <button class="button button-secondary" type="button" id="swapLanguages">Swap quick target</button>
              <button class="button button-secondary" type="button" id="copyTranslation">Copy result</button>
              <button class="button button-secondary" type="button" id="clearTranslation">Clear</button>
            </div>
          </form>
        </article>

        <article class="translet-card translet-result-card">
          <div class="planner-section-head translet-head">
            <div>
              <p class="eyebrow">Result</p>
              <h3>Translation output</h3>
            </div>
            <p class="section-note">The result can be copied or spoken aloud after it is generated.</p>
          </div>

          <div class="translet-result-panel">
            <p id="transletOutput" class="translet-output">Your translation will appear here.</p>
          </div>

          <div class="translet-meta-grid">
            <article class="translet-meta-card">
              <strong>Direction</strong>
              <span id="transletMeta">Choose a target language to get started.</span>
            </article>
            <article class="translet-meta-card">
              <strong>Status</strong>
              <span id="transletStatus">Ready to translate.</span>
            </article>
          </div>

          <div class="hero-actions translet-speak-row">
            <button class="button button-secondary" type="button" id="transletListenButton" aria-label="Speak translated output" title="Speak translated output">Listen to result</button>
            <button class="button button-secondary" type="button" id="resetRecentButton">Refresh recent</button>
          </div>
        </article>

        <article class="translet-card translet-widget-shell">
          <div class="planner-section-head translet-head">
            <div>
              <p class="eyebrow">Google widget</p>
              <h3>Translate the page itself</h3>
            </div>
            <p class="section-note">This keeps the visible page text easy to switch while the custom translation box handles single phrases.</p>
          </div>
          <div id="google_translate_element" class="google-translate-host">Loading Google widget...</div>
        </article>
      </div>

      <aside class="translet-sidebar">
        <article class="translet-card">
          <p class="eyebrow">Language pack</p>
          <h3>Popular travel targets</h3>
          <div class="translet-language-pills" id="transletLanguagePills">
            ${TRANSLATE_LANGUAGES
              .filter(([code]) => code !== "auto")
              .map(([code, label]) => `<button class="translet-language-pill" type="button" data-target-lang="${code}">${label}</button>`)
              .join("")}
          </div>
        </article>

        <article class="translet-card">
          <p class="eyebrow">Why it helps</p>
          <h3>Best used for short, useful lines</h3>
          <ul class="translet-list">
            <li>Restaurant requests and menu questions</li>
            <li>Directions, pickup points and station help</li>
            <li>Hotel check-in, timing and booking notes</li>
          </ul>
        </article>

        <article class="translet-card">
          <p class="eyebrow">Recent translations</p>
          <h3>Your last few phrases</h3>
          <div id="transletRecentList" class="translet-recent-list"></div>
        </article>
      </aside>
    </section>
  `;
}

export function initTranslet() {
  bootstrapGoogleTranslatePersistence();
  initGoogleTranslateWidget("google_translate_element");

  const form = document.getElementById("transletForm");
  const input = document.getElementById("transletInput");
  const source = document.getElementById("transletSource");
  const target = document.getElementById("transletTarget");
  const output = document.getElementById("transletOutput");
  const meta = document.getElementById("transletMeta");
  const status = document.getElementById("transletStatus");
  const swap = document.getElementById("swapLanguages");
  const copy = document.getElementById("copyTranslation");
  const clear = document.getElementById("clearTranslation");
  const listen = document.getElementById("transletListenButton");
  const refreshRecent = document.getElementById("resetRecentButton");
  const recentHolder = document.getElementById("transletRecentList");
  const submitButton = form.querySelector('button[type="submit"]');

  let requestId = 0;

  const savedTarget = window.localStorage.getItem(TARGET_KEY);
  if (savedTarget && TRANSLATE_LANGUAGES.some(([code]) => code === savedTarget && code !== "auto")) {
    target.value = savedTarget;
  }

  const renderIdle = () => {
    output.textContent = "Your translation will appear here.";
    meta.textContent = "Choose a target language to get started.";
    status.textContent = "Ready to translate.";
  };

  const setLoading = (isLoading) => {
    submitButton.textContent = isLoading ? "Translating..." : "Translate";
    submitButton.classList.toggle("is-loading", isLoading);
  };

  const syncRecent = () => {
    renderRecentList(recentHolder, loadRecentTranslations());
  };

  const applyTranslation = async () => {
    const text = input.value.trim();
    const targetLanguage = target.value;
    window.localStorage.setItem(TARGET_KEY, targetLanguage);

    if (!text) {
      renderIdle();
      return;
    }

    const currentRequest = ++requestId;
    setLoading(true);
    status.textContent = "Sending request to the backend...";

    try {
      const translated = await translateText(text, targetLanguage);
      if (currentRequest !== requestId) return;

      output.textContent = translated;
      meta.textContent = `Target language: ${languageLabel(targetLanguage)}. Source is auto-detected by the backend.`;

      if (translated === text) {
        status.textContent = "Backend returned the same text.";
        showToast("The backend returned the input text unchanged.", "default");
      } else {
        status.textContent = `Translated into ${languageLabel(targetLanguage)}.`;
        showToast("Text translated successfully.", "success");
      }

      const updatedRecent = pushRecentTranslation({
        input: text,
        translated,
        target: targetLanguage,
      });
      renderRecentList(recentHolder, updatedRecent);
    } catch (error) {
      if (currentRequest !== requestId) return;
      output.textContent = "Translation is unavailable right now.";
      meta.textContent = `Target language: ${languageLabel(targetLanguage)}.`;
      status.textContent = error.message || "Backend translation failed.";
      showToast(error.message || "Translation failed.", "warning");
    } finally {
      if (currentRequest === requestId) {
        setLoading(false);
      }
    }
  };

  const runQuickTranslate = (text) => {
    input.value = text;
    applyTranslation();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    applyTranslation();
  });

  input.addEventListener("input", () => {
    if (!input.value.trim()) {
      renderIdle();
      status.textContent = "Ready to translate.";
    }
  });

  target.addEventListener("change", () => {
    window.localStorage.setItem(TARGET_KEY, target.value);
    meta.textContent = `Target language: ${languageLabel(target.value)}. Source is auto-detected by the backend.`;
  });

  swap.addEventListener("click", () => {
    target.value = target.value === "hi" ? "en" : "hi";
    window.localStorage.setItem(TARGET_KEY, target.value);
    meta.textContent = `Target language: ${languageLabel(target.value)}.`;
    showToast(`Target switched to ${languageLabel(target.value)}.`, "default");
  });

  copy.addEventListener("click", async () => {
    const text = output.textContent?.trim();
    if (!text || text === "Your translation will appear here." || text === "Translation is unavailable right now.") {
      showToast("Nothing to copy yet.", "warning");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Translation copied.", "success");
    } catch {
      showToast("Copy is unavailable in this browser.", "warning");
    }
  });

  clear.addEventListener("click", () => {
    input.value = "";
    target.value = savedTarget || "hi";
    window.localStorage.setItem(TARGET_KEY, target.value);
    renderIdle();
    showToast("Translation cleared.", "default");
  });

  listen.addEventListener("click", () => {
    const text = output.textContent?.trim();
    if (!text || text === "Your translation will appear here." || text === "Translation is unavailable right now.") {
      showToast("Translate something first.", "warning");
      return;
    }
    if (!speakText(text, target.value)) {
      showToast("Speech output is unavailable in this browser.", "warning");
      return;
    }
    showToast("Speaking the translated output.", "success");
  });

  refreshRecent.addEventListener("click", syncRecent);

  document.getElementById("transletLanguagePills")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-target-lang]");
    if (!button) return;
    target.value = button.dataset.targetLang || "hi";
    window.localStorage.setItem(TARGET_KEY, target.value);
    meta.textContent = `Target language: ${languageLabel(target.value)}. Source is auto-detected by the backend.`;
    showToast(`Target switched to ${languageLabel(target.value)}.`, "default");
  });

  document.querySelectorAll("[data-sample]").forEach((button) => {
    button.addEventListener("click", () => {
      const sample = decodeData(button.dataset.sample);
      if (!sample) return;
      runQuickTranslate(sample);
    });
  });

  recentHolder?.addEventListener("click", (event) => {
    const button = event.target.closest(".translet-recent-item");
    if (!button) return;
    const itemTarget = decodeData(button.dataset.target) || "hi";
    target.value = itemTarget;
    window.localStorage.setItem(TARGET_KEY, itemTarget);
    input.value = decodeData(button.dataset.input);
    meta.textContent = `Target language: ${languageLabel(itemTarget)}. Source is auto-detected by the backend.`;
    showToast(`Loaded recent phrase in ${languageLabel(itemTarget)}.`, "default");
  });

  syncRecent();
  renderIdle();

  if (source) {
    source.value = "auto";
  }
}
