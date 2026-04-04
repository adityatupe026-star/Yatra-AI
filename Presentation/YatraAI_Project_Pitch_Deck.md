# YatraAI Project Pitch Deck

## Slide 1: Title
**YatraAI**  
India Travel, Tourism, and Trip Intelligence Platform

Subtitle:
An AI-powered travel assistant, planner, translator, and tourism analytics system for India.

Speaker note:
Open with the one-line mission: make India travel easier to plan, understand, and analyze.

---

## Slide 2: The Problem
Travel planning is fragmented.

- People search across many sites
- Travel advice is generic or trip-limited
- Language barriers reduce comfort
- Tourism teams lack simple insight dashboards

Speaker note:
Explain that users need one place for planning, chat, translation, and destination discovery.

---

## Slide 3: Our Solution
YatraAI brings the whole travel flow into one product.

- AI trip planner
- India travel chat
- `Translate` for Indian language translation
- destination browsing
- tourism dashboard for insights

Speaker note:
Frame YatraAI as both a user product and a business intelligence tool.

---

## Slide 4: Product Experience
The frontend includes:

- Home
- Destinations
- Planner
- Chat
- Translate
- Explorer
- India Map
- History
- Wishlist

Speaker note:
Show that this is a complete travel platform, not a single feature demo.

---

## Slide 5: Chat Intelligence
The chat has two modes.

- `Trip: Yes` uses current trip context
- `Trip: No` behaves like a broad India travel expert

Additional controls:

- mic button
- speech button
- save answer to planner

Speaker note:
This is important because it stops the AI from being locked only to one current trip.

---

## Slide 6: Translate
`Translate` helps users communicate in Indian languages.

- translation through backend API
- target language selection
- copy translated output
- speech output for translated text

Speaker note:
Position this as a travel comfort feature for real-world India travel.

---

## Slide 7: Dashboard Vision
The dashboard is tourism-focused, not app-performance focused.

It analyzes:

- destination trends
- budgets
- crowd patterns
- ratings
- itinerary behavior
- local language and safety guidance

Speaker note:
This is the business layer of the product.

---

## Slide 8: Data Story
The project uses structured tourism data.

Sources:

- `data/places_dataset.csv`
- `data/hackathon/destinations.json`
- `data/hackathon/itineraries.json`
- `data/hackathon/local_intelligence.json`
- `data/hackathon/cost_benchmarks.json`

Logging:

- CSV logs for queries, sessions, translations, interactions, and chat

Speaker note:
Tell the audience that the product is built for analysis, not just UI.

---

## Slide 9: Architecture
High-level flow:

1. User interacts with frontend
2. Frontend calls FastAPI backend
3. Backend calls travel engine or translation API
4. Backend logs structured data to CSV
5. Streamlit dashboard reads tourism data

Speaker note:
Use this slide to prove the system is modular and scalable.

---

## Slide 10: Business Value
YatraAI can support:

- travel discovery
- itinerary planning
- multilingual experience
- business insight generation
- destination demand analysis

Speaker note:
Tie the project to user value and business intelligence.

---

## Slide 11: Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Python, FastAPI
- Dashboard: Streamlit
- Data: CSV and JSON
- AI: travel engine, translation API, browser speech output

Speaker note:
Keep this concise and confident.

---

## Slide 12: Closing
YatraAI turns travel into a guided, multilingual, data-backed experience.

Tagline:
Travel smarter. Speak easier. Plan better.

Speaker note:
End with the product vision and future potential.

---

## Optional Demo Order

1. Home
2. Destinations
3. Planner
4. Chat
5. Translate
6. Tourism dashboard
