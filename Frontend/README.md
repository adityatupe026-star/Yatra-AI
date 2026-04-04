# YatraAI Frontend

This folder contains the full India travel app experience.

It includes:

- home
- destinations
- planner
- chat
- Translate
- explorer
- India map
- events
- history
- wishlist
- about
- privacy

The frontend is designed to feel premium, cinematic, and mobile-friendly.

## File Layout

### HTML Pages

- [index.html](D:/Yatraai/Frontend/index.html)
- [destinations.html](D:/Yatraai/Frontend/destinations.html)
- [planner.html](D:/Yatraai/Frontend/planner.html)
- [chat.html](D:/Yatraai/Frontend/chat.html)
- [explorer.html](D:/Yatraai/Frontend/explorer.html)
- [map.html](D:/Yatraai/Frontend/map.html)
- [events.html](D:/Yatraai/Frontend/events.html)
- [history.html](D:/Yatraai/Frontend/history.html)
- [wishlist.html](D:/Yatraai/Frontend/wishlist.html)
- [about.html](D:/Yatraai/Frontend/about.html)
- [privacy.html](D:/Yatraai/Frontend/privacy.html)
- [404.html](D:/Yatraai/Frontend/404.html)

### JavaScript

- [scripts/main.js](D:/Yatraai/Frontend/scripts/main.js) boots the app and wires the shell
- [scripts/core/config.js](D:/Yatraai/Frontend/scripts/core/config.js) stores nav and travel constants
- [scripts/core/state.js](D:/Yatraai/Frontend/scripts/core/state.js) manages browser storage
- [scripts/data/site-data.js](D:/Yatraai/Frontend/scripts/data/site-data.js) holds the destination seed data
- [scripts/components/nav.js](D:/Yatraai/Frontend/scripts/components/nav.js) renders the header and mobile nav
- [scripts/components/cards.js](D:/Yatraai/Frontend/scripts/components/cards.js) builds reusable cards
- [scripts/components/motion.js](D:/Yatraai/Frontend/scripts/components/motion.js) handles reveal and animation effects
- [scripts/components/toast.js](D:/Yatraai/Frontend/scripts/components/toast.js) shows lightweight notifications
- [scripts/utils/ai.js](D:/Yatraai/Frontend/scripts/utils/ai.js) handles chat requests and fallback responses
- [scripts/utils/travel.js](D:/Yatraai/Frontend/scripts/utils/travel.js) contains planner logic and map helpers
- [scripts/utils/weather.js](D:/Yatraai/Frontend/scripts/utils/weather.js) fetches weather and caches recent results
- [scripts/utils/speech.js](D:/Yatraai/Frontend/scripts/utils/speech.js) handles browser speech playback
- [scripts/pages/*.js](D:/Yatraai/Frontend/scripts/pages) contains page-specific behavior

### Styles

- [styles/main.css](D:/Yatraai/Frontend/styles/main.css)
- [styles/base.css](D:/Yatraai/Frontend/styles/base.css)
- [styles/layout.css](D:/Yatraai/Frontend/styles/layout.css)
- [styles/sections.css](D:/Yatraai/Frontend/styles/sections.css)
- [styles/animations.css](D:/Yatraai/Frontend/styles/animations.css)
- [styles/responsive.css](D:/Yatraai/Frontend/styles/responsive.css)

## Visual Direction

The UI uses:

- dark warm gradients
- gold accent colors
- editorial travel cards
- glassy panels
- large typography
- image-led hero sections

## Key Pages

### Home

The landing page introduces the platform and routes users into planning, chat, destinations, and wishlist flows.

### Destinations

Users can:

- search by destination, state, region, or mood
- filter by season and interest
- compare up to three destinations
- save places to the wishlist

### Planner

Users can:

- generate route plans
- estimate budget and travel costs
- view nearby suggestions
- see weather and phrasebook context
- export a trip summary

### Chat

Chat supports:

- trip-aware answers
- expert travel answers when trip context is off
- multiple chat sessions
- speech output for the latest response
- a mic button that currently shows an unavailable message

### Translate

Translate supports:

- translation into English, Hindi and Marathi
- live re-translation while you type
- saved target language in `localStorage`
- copy result
- speech playback of translated output

### Explorer

Explorer provides a deeper destination view with logistics, weather, local language notes, and nearby planning support.

### India Map

The map view shows India-wide travel context and travel place discovery.

### History and Wishlist

These pages store and revisit plans and saved destinations in browser storage.

## Shared Behavior

The frontend stores:

- current plan
- trip history
- chat sessions
- wishlist items

All of this is handled locally in `localStorage`.

## Running Locally

The frontend is served by the FastAPI backend.

Use the scripts in [Run](/D:/Yatraai/Run) instead of opening HTML files directly.

## Backend Bridge

Chat first tries the backend, then the local fallback path.
Translation goes through `POST /translate`, which forwards through the FastAPI backend to Google Cloud Translation when `GOOGLE_TRANSLATE_API_KEY` is set.
