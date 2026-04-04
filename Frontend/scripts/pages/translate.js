import { showToast } from "../components/toast.js";
import { speakText } from "../utils/speech.js";
import { initGoogleTranslateWidget } from "../utils/google-translate.js";
import { API_CONFIG } from "../core/config.js";

const LANGUAGE_OPTIONS = [
  ["en", "English"],
  ["hi", "Hindi"],
  ["mr", "Marathi"],
];

const STORAGE_KEY = "yatraai.translate.targetLanguage";

function languageLabel(code) {
  return LANGUAGE_OPTIONS.find(([value]) => value === code)?.[1] || code;
}

function languageOptions(selectedCode) {
  return LANGUAGE_OPTIONS
    .map(([code, label]) => `<option value="${code}" ${code === selectedCode ? "selected" : ""}>${label}</option>`)
    .join("");
}

async function translate(text, lang) {
  const response = await fetch(API_CONFIG.translateEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target: lang }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Translation failed.");
  }
  return data.translated || text;
}

export function translateMarkup() {
  return `
    <section class="page-hero">
      <p class="eyebrow">Translate text</p>
      <h1>Turn one message into another Indian language</h1>
      <p>Use Google Translate for the page widget and LibreTranslate for the custom translation section below.</p>
    </section>
    <section class="section">
      <div class="planner-section-block planner-section-block-soft translate-widget-shell" style="margin-bottom: 22px;">
        <div class="planner-section-head">
          <p class="eyebrow">Google widget</p>
          <h3>Quick page translation</h3>
        </div>
        <p class="section-note">Translate the visible page text with Google before using the local LibreTranslate section below.</p>
        <div id="google_translate_element" class="google-translate-host">Loading Google widget...</div>
      </div>

      <div class="ai-console">
        <div class="planner-section-block planner-section-block-soft">
          <div class="planner-section-head">
            <p class="eyebrow">Translate text</p>
            <h3>Translate one message into another Indian language</h3>
          </div>
          <form class="quick-planner" id="translateForm">
            <label class="translate-field">Text to translate
              <textarea id="translateInput" rows="6" placeholder="Type or paste a sentence, phrase, or travel note"></textarea>
            </label>
            <div class="quick-grid triple">
              <label>Source language
                <select id="translateSource" disabled>
                  <option value="auto" selected>Auto Detect</option>
                </select>
              </label>
              <label>Target language
                <select id="translateTarget">${languageOptions("hi")}</select>
              </label>
              <label>Quickhint
                <input type="text" value="Tourist phrases" disabled aria-label="Quick translation hint">
              </label>
            </div>
            <div class="hero-actions planner-actions">
              <button class="button button-primary" type="submit">Translate now</button>
              <button class="button button-secondary" type="button" id="swapLanguage">Swap</button>
              <button class="button button-secondary" type="button" id="copyTranslation">Copy result</button>
              <button class="button button-secondary" type="button" id="translateListenButton" aria-label="Speak translated output" title="Speak translated output">&#128266;</button>
            </div>
          </form>
        </div>

        <article class="planner-section-block planner-section-block-soft">
          <div class="planner-section-head">
            <p class="eyebrow">Result</p>
            <h3>Translation output</h3>
          </div>
          <div class="planner-mini-grid">
            <article class="planner-mini-note">
              <strong>Translated text</strong>
              <p id="translateOutput">Your translation will appear here.</p>
            </article>
            <article class="planner-mini-note">
              <strong>Language details</strong>
              <p id="translateMeta">Choose a target language to get started.</p>
            </article>
          </div>
        </article>
      </div>
    </section>
  `;
}

export function initTranslate() {
  initGoogleTranslateWidget("google_translate_element");

  const form = document.getElementById("translateForm");
  const input = document.getElementById("translateInput");
  const target = document.getElementById("translateTarget");
  const output = document.getElementById("translateOutput");
  const meta = document.getElementById("translateMeta");
  const swap = document.getElementById("swapLanguage");
  const copy = document.getElementById("copyTranslation");
  const listen = document.getElementById("translateListenButton");
  const button = form.querySelector('button[type="submit"]');

  let timer = null;
  let requestId = 0;

  const savedTarget = window.localStorage.getItem(STORAGE_KEY);
  if (savedTarget && LANGUAGE_OPTIONS.some(([code]) => code === savedTarget)) {
    target.value = savedTarget;
  }

  const setIdle = () => {
    output.textContent = "Your translation will appear here.";
    meta.textContent = "Choose a target language to get started.";
  };

  const setLoading = (isLoading) => {
    button.textContent = isLoading ? "Translating..." : "Translate now";
    button.classList.toggle("is-loading", isLoading);
  };

  const renderTranslation = async () => {
    const text = input.value.trim();
    const lang = target.value;
    window.localStorage.setItem(STORAGE_KEY, lang);
    if (!text) {
      setIdle();
      return;
    }
    const currentRequest = ++requestId;
    setLoading(true);
    try {
      const translated = await translate(text, lang);
      if (currentRequest !== requestId) return;
      output.textContent = translated;
      meta.textContent = translated === text
        ? `Showing original text in ${languageLabel(lang)} because translation was not available.`
        : `Translated into ${languageLabel(lang)}.`;
    } catch (error) {
      if (currentRequest !== requestId) return;
      output.textContent = error.message || "Translation is unavailable right now.";
      meta.textContent = "Start the backend to translate through the Python API.";
      showToast("Translation needs the backend to be running.", "warning");
    } finally {
      if (currentRequest === requestId) {
        setLoading(false);
      }
    }
  };

  const scheduleTranslate = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(renderTranslation, 320);
  };

  target.addEventListener("change", () => {
    window.localStorage.setItem(STORAGE_KEY, target.value);
    scheduleTranslate();
  });

  swap.addEventListener("click", () => {
    target.value = target.value === "hi" ? "mr" : "hi";
    window.localStorage.setItem(STORAGE_KEY, target.value);
    scheduleTranslate();
  });

  input.addEventListener("input", scheduleTranslate);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderTranslation();
  });

  copy.addEventListener("click", async () => {
    const text = output.textContent?.trim();
    if (!text || text === "Your translation will appear here.") {
      showToast("Nothing to copy yet.", "warning");
      return;
    }
    await navigator.clipboard.writeText(text);
    showToast("Translation copied.", "success");
  });

  listen.addEventListener("click", () => {
    const text = output.textContent?.trim();
    if (!text || text === "Your translation will appear here.") {
      showToast("Translate something first.", "warning");
      return;
    }
    if (!speakText(text, target.value)) {
      showToast("Speech output is unavailable in this browser.", "warning");
      return;
    }
    showToast("Speaking the translated output.", "success");
  });

  setIdle();
}
