export function aboutMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">About YatraAI</p><h1>Built for Indian travel, not generic trip templates.</h1><p>YatraAI combines curated destination knowledge, modular frontend design and Ollama-powered trip assistance to make planning feel local, visual and practical.</p></section>
    <section class="section feature-grid">
      <article class="feature-card"><h3>Mission</h3><p>Help travelers plan Indian trips with context: transport logic, food intent, season timing, region-specific detail and reusable saved plans.</p></article>
      <article class="feature-card"><h3>What powers it</h3><p>Modular JavaScript frontend, Ollama for AI responses, curated place/event data, map routing, wishlist memory and export/share utilities.</p></article>
      <article class="feature-card"><h3>Built for hackathons</h3><p>The app balances fast storytelling, visible motion polish and real travel utility so judges can immediately see both product thinking and technical depth.</p></article>
      <article class="feature-card"><h3>Team story</h3><p>YatraAI started as a travel planner for India that should feel cinematic on the surface but stay genuinely useful underneath.</p></article>
    </section>
  `;
}

export function initAbout() {}

export function privacyMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">Privacy Policy</p><h1>Simple privacy for a demo travel app.</h1><p>YatraAI stores local wishlist, plans and chat sessions in your browser so you can continue planning between visits.</p></section>
    <section class="section">
      <article class="route-card">
        <p class="eyebrow">What we store</p>
        <h3>Browser-local trip memory</h3>
        <p>Current plans, trip history, chat sessions and wishlist items are saved in your own browser storage. API requests to Ollama or weather providers are only used to answer the features you trigger.</p>
      </article>
    </section>
  `;
}
