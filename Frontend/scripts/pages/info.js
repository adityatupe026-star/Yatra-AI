export function aboutMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">About YatraAI</p><h1>Built for Indian travel, not generic trip templates.</h1><p>YatraAI combines curated destination knowledge, modular frontend design and Ollama-powered trip assistance to make planning feel local, visual and practical.</p></section>
    <section class="section feature-grid">
      <article class="feature-card"><p class="eyebrow">Mission</p><h3>Local-first planning</h3><p>Help travelers plan Indian trips with context: transport logic, food intent, season timing, region-specific detail and reusable saved plans.</p></article>
      <article class="feature-card"><p class="eyebrow">Tech stack</p><h3>Modern travel layers</h3><p>Ollama, Leaflet, Open-Meteo, localStorage, modular JavaScript, shareable itinerary links and destination datasets work together here.</p></article>
      <article class="feature-card"><p class="eyebrow">Hackathon angle</p><h3>Built to demo fast</h3><p>The product balances visible motion polish, strong information architecture and real planning value so judges can understand it quickly.</p></article>
      <article class="feature-card"><p class="eyebrow">Team story</p><h3>From concept to system</h3><p>YatraAI began as a travel planner for India that should feel cinematic on the surface but stay genuinely useful underneath.</p></article>
      <article class="feature-card"><p class="eyebrow">Why it matters</p><h3>Trip memory with purpose</h3><p>Saved plans, chat context and wishlist memory keep the product useful after the first visit, not just during the first search.</p></article>
      <article class="feature-card"><p class="eyebrow">Design principle</p><h3>Bold, readable, practical</h3><p>Premium visuals matter, but every card still aims to answer a real travel question: where, when, how, and at what cost.</p></article>
    </section>
  `;
}

export function initAbout() {}

export function privacyMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">Privacy Policy</p><h1>Simple privacy for a demo travel app.</h1><p>YatraAI stores local wishlist, plans and chat sessions in your browser so you can continue planning between visits.</p><p class="section-note">Last updated: March 31, 2026</p></section>
    <section class="section feature-grid">
      <article class="feature-card"><p class="eyebrow">What we store</p><h3>Browser-local trip memory</h3><p>Current plans, trip history, chat sessions and wishlist items are saved in your own browser storage. API requests to Ollama or weather providers are only used to answer the features you trigger.</p></article>
      <article class="feature-card"><p class="eyebrow">What we do not store</p><h3>No account profile</h3><p>We do not create a cloud account, profile or persistent server-side identity for you in this demo frontend.</p></article>
      <article class="feature-card"><p class="eyebrow">Third-party APIs</p><h3>External services used</h3><p>YatraAI can call Ollama for assistant replies and Open-Meteo for weather. Destination data, maps and links are surfaced through the frontend itself.</p></article>
      <article class="feature-card"><p class="eyebrow">Clearing data</p><h3>Reset anytime</h3><p>Clear localStorage in your browser to remove plans, wishlist items and chat history. A fresh reload will start from scratch.</p></article>
      <article class="feature-card"><p class="eyebrow">Travel contact</p><h3>Contact the team</h3><p>If you have a privacy question about the demo, reach out at <a class="inline-link" href="mailto:hello@yatraai.in">hello@yatraai.in</a>.</p></article>
      <article class="feature-card"><p class="eyebrow">Data model</p><h3>Lightweight by design</h3><p>The app keeps only the minimum browser state required for planning continuity, wishlist shortcuts and chat history on the same device.</p></article>
    </section>
  `;
}
