import { TRANSLATE_LANGUAGES } from "../core/config.js";
import { showToast } from "../components/toast.js";

const INDIA_LANGUAGE_CODES = new Set(TRANSLATE_LANGUAGES.map(([code]) => code).filter((code) => code !== "auto"));

function languageLabel(code) {
  return TRANSLATE_LANGUAGES.find(([itemCode]) => itemCode === code)?.[1] || code;
}

function languageOptions(selectedCode, includeAuto = true) {
  return TRANSLATE_LANGUAGES
    .filter(([code]) => includeAuto || code !== "auto")
    .map(([code, label]) => `<option value="${code}" ${code === selectedCode ? "selected" : ""}>${label}</option>`)
    .join("");
}

async function translateText(payload) {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Translation failed.");
  }
  return data;
}

export function transletMarkup() {
  return `
    <section class="page-hero">
      <p class="eyebrow">Google Translate API</p>
      <h1>Translet Indian languages fast</h1>
      <p>Paste text, choose a target language, and let YatraAI proxy the translation through Google Cloud Translation so travel phrases stay usable across India.</p>
    </section>
    <section class="section planner-layout single-top">
      <div class="ai-console">
        <form class="quick-planner" id="transletForm">
          <div class="planner-section-block">
            <div class="planner-section-head">
              <p class="eyebrow">Translate text</p>
              <h3>Turn one message into another Indian language</h3>
            </div>
            <label>Text to translate
              <textarea id="transletInput" rows="6" placeholder="Type or paste a sentence, phrase, or travel note"></textarea>
            </label>
            <div class="hero-actions">
              <button class="button button-secondary" type="button" id="transletMicButton" aria-label="Speech input unavailable" title="Speech input unavailable">🎤</button>
            </div>
            <div class="quick-grid triple">
              <label>Source language
                <select id="transletSource">${languageOptions("auto")}</select>
              </label>
              <label>Target language
                <select id="transletTarget">${languageOptions("hi", false)}</select>
              </label>
              <label>Quick hint
                <input type="text" value="Tourist phrases" disabled aria-label="Quick hint">
              </label>
            </div>
            <div class="hero-actions planner-actions">
              <button class="button button-primary" type="submit">Translate</button>
              <button class="button button-secondary" type="button" id="swapLanguages">Swap</button>
              <button class="button button-secondary" type="button" id="copyTranslation">Copy result</button>
            </div>
          </div>
          <article class="planner-section-block planner-section-block-soft">
            <div class="planner-section-head">
              <p class="eyebrow">Result</p>
              <h3>Translation output</h3>
            </div>
            <div class="planner-mini-grid">
              <article class="planner-mini-note">
                <strong>Translated text</strong>
                <p id="transletOutput">Your translation will appear here.</p>
              </article>
              <article class="planner-mini-note">
                <strong>Language details</strong>
                <p id="transletMeta">Choose a target language to get started.</p>
              </article>
            </div>
            <div class="hero-actions">
              <button class="button button-secondary" type="button" id="transletListenButton" aria-label="Speech output unavailable" title="Speech output unavailable">🔊</button>
            </div>
            <div class="planner-mini-note">
              <strong>Examples for travelers</strong>
              <p>Try greetings, food orders, addresses, and emergency phrases before a trip. Google Cloud Translation handles the heavy lifting behind the scenes.</p>
            </div>
          </article>
        </form>
      </div>
      <aside class="planner-sidebar">
        <article class="sidebar-card">
          <p class="eyebrow">Indian language pack</p>
          <h3>Built for common travel routes</h3>
          <ul>
            <li>Hindi, Marathi, Bengali, Tamil, Telugu and Kannada</li>
            <li>Malayalam, Gujarati, Punjabi, Urdu and Odia</li>
            <li>Assamese and Konkani for regional use cases</li>
          </ul>
        </article>
        <article class="sidebar-card">
          <p class="eyebrow">API note</p>
          <h3>Uses Google Cloud Translation</h3>
          <ul>
            <li>Backend proxy keeps your API key off the browser</li>
            <li>Set <code>GOOGLE_TRANSLATE_API_KEY</code> on the server</li>
            <li>The page still works as a normal UI if the API is unavailable</li>
          </ul>
        </article>
        <article class="sidebar-card">
          <p class="eyebrow">Travel use</p>
          <h3>Best for quick phrase conversion</h3>
          <ul>
            <li>Restaurant requests</li>
            <li>Directions and transport help</li>
            <li>Simple booking and hotel questions</li>
          </ul>
        </article>
      </aside>
    </section>
  `;
}

export function initTranslet() {
  const form = document.getElementById("transletForm");
  const input = document.getElementById("transletInput");
  const source = document.getElementById("transletSource");
  const target = document.getElementById("transletTarget");
  const output = document.getElementById("transletOutput");
  const meta = document.getElementById("transletMeta");
  const swap = document.getElementById("swapLanguages");
  const copy = document.getElementById("copyTranslation");
  const mic = document.getElementById("transletMicButton");
  const listen = document.getElementById("transletListenButton");

  const showAudioUnavailable = () => {
    showToast("Speech input and playback are currently unavailable.", "warning");
  };

  const renderIdle = () => {
    output.textContent = "Your translation will appear here.";
    meta.textContent = "Choose a target language to get started.";
  };

  const setLoading = (isLoading) => {
    const button = form.querySelector('button[type="submit"]');
    button.textContent = isLoading ? "Translating..." : "Translate";
    button.classList.toggle("is-loading", isLoading);
  };

  swap.addEventListener("click", () => {
    const currentSource = source.value;
    source.value = target.value;
    target.value = currentSource === "auto" ? "en" : currentSource;
    if (!input.value.trim()) {
      renderIdle();
    }
    showToast("Language direction swapped.", "default");
  });

  copy.addEventListener("click", async () => {
    if (!output.textContent || output.textContent === "Your translation will appear here.") {
      showToast("Nothing to copy yet.", "warning");
      return;
    }
    await navigator.clipboard.writeText(output.textContent);
    showToast("Translation copied.", "success");
  });

  mic?.addEventListener("click", showAudioUnavailable);
  listen?.addEventListener("click", showAudioUnavailable);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      showToast("Paste some text first.", "warning");
      return;
    }
    setLoading(true);
    try {
      const result = await translateText({
        text,
        sourceLanguage: source.value,
        targetLanguage: target.value,
      });
      output.textContent = result.translatedText || "";
      const detected = result.detectedSourceLanguage ? languageLabel(result.detectedSourceLanguage) : "Detected automatically";
      meta.textContent = `From ${detected} to ${languageLabel(result.targetLanguage)}. ${result.provider || "Google Cloud Translation"} handled the request.`;
      showToast("Text translated successfully.", "success");
    } catch (error) {
      output.textContent = "Translation is unavailable right now.";
      meta.textContent = error.message;
      showToast(error.message, "warning");
    } finally {
      setLoading(false);
    }
  });

  input.addEventListener("input", () => {
    if (!input.value.trim()) renderIdle();
  });

  renderIdle();
  if (!INDIA_LANGUAGE_CODES.has(target.value)) {
    target.value = "hi";
  }
}
