# YatraAI Frontend

## What This Is

This folder contains the full YatraAI website experience: a multi-page travel app for India with curated destinations, a trip planner, AI chat, explorer tools, a map view, history, wishlist, events, a travel partner inbox, and informational pages.

The frontend is designed to feel premium and easy to demo:

- bold editorial home page
- route planning with local memory
- destination discovery and comparison
- browser-based chat sessions
- map and explorer utilities
- saved trip history and wishlist
- travel partner inbox and home-page partner teaser
- cleaner booking cards and saved booking storage
- polished mobile behavior and responsive layouts
- lightweight offline-friendly shell behavior

## File Layout

### HTML Pages

- [index.html](D:/Yatraai/Frontend/index.html)
- [destinations.html](D:/Yatraai/Frontend/destinations.html)
- [planner.html](D:/Yatraai/Frontend/planner.html)
- [bookings.html](D:/Yatraai/Frontend/bookings.html)
- [chat.html](D:/Yatraai/Frontend/chat.html)
- [partner-inbox.html](D:/Yatraai/Frontend/partner-inbox.html)
- [explorer.html](D:/Yatraai/Frontend/explorer.html)
- [map.html](D:/Yatraai/Frontend/map.html)
- [events.html](D:/Yatraai/Frontend/events.html)
- [history.html](D:/Yatraai/Frontend/history.html)
- [wishlist.html](D:/Yatraai/Frontend/wishlist.html)
- [about.html](D:/Yatraai/Frontend/about.html)
- [privacy.html](D:/Yatraai/Frontend/privacy.html)
- [404.html](D:/Yatraai/Frontend/404.html)

### JavaScript

- [scripts/main.js](D:/Yatraai/Frontend/scripts/main.js) boots the app, renders the shell, and wires shared enhancements.
- [scripts/core/config.js](D:/Yatraai/Frontend/scripts/core/config.js) stores page constants, seasons, phrases, contacts, and nav groups.
- [scripts/core/state.js](D:/Yatraai/Frontend/scripts/core/state.js) manages browser storage for plans, chats, and wishlist items.
- [scripts/data/site-data.js](D:/Yatraai/Frontend/scripts/data/site-data.js) contains the destination and event dataset used throughout the UI.
- [scripts/data/partner-inbox-data.js](D:/Yatraai/Frontend/scripts/data/partner-inbox-data.js) stores the dummy travel partner requests used on Home and the inbox page.
- [scripts/components/nav.js](D:/Yatraai/Frontend/scripts/components/nav.js) renders the header, mobile drawer, mobile bottom nav, and offline banner.
- [scripts/components/cards.js](D:/Yatraai/Frontend/scripts/components/cards.js) builds shared card markup.
- [scripts/components/motion.js](D:/Yatraai/Frontend/scripts/components/motion.js) handles reveal animations and counters.
- [scripts/components/toast.js](D:/Yatraai/Frontend/scripts/components/toast.js) shows lightweight notifications.
- [scripts/utils/ai.js](D:/Yatraai/Frontend/scripts/utils/ai.js) handles chat responses, fallback demo replies, and AI context text.
- [scripts/utils/travel.js](D:/Yatraai/Frontend/scripts/utils/travel.js) contains planner logic, map helpers, budget estimates, and share-link encoding.
- [scripts/utils/weather.js](D:/Yatraai/Frontend/scripts/utils/weather.js) fetches weather and caches recent responses.
- [scripts/pages/*.js](D:/Yatraai/Frontend/scripts/pages) contains the page-specific UI and behavior modules.

### Styles

- [styles/main.css](D:/Yatraai/Frontend/styles/main.css) imports the full style system.
- [styles/base.css](D:/Yatraai/Frontend/styles/base.css) holds global variables, shell styling, typography, buttons, forms, nav, and core UI primitives.
- [styles/layout.css](D:/Yatraai/Frontend/styles/layout.css) handles page-level structure such as chat, planner, footer, and cards.
- [styles/sections.css](D:/Yatraai/Frontend/styles/sections.css) handles feature sections, grids, empty states, map list, event calendar, wishlist summary, and detailed content blocks.
- [styles/pages/bookings.css](D:/Yatraai/Frontend/styles/pages/bookings.css) styles the bookings hub cards and saved-trip panels.
- [styles/pages/*.css](D:/Yatraai/Frontend/styles/pages) contains page-specific CSS for the other routes.
- [styles/partner-inbox.css](D:/Yatraai/Frontend/styles/partner-inbox.css) styles the travel partner inbox and its home-page teaser cards.
- [styles/animations.css](D:/Yatraai/Frontend/styles/animations.css) holds motion, shimmer, hover, and reveal effects.
- [styles/responsive.css](D:/Yatraai/Frontend/styles/responsive.css) controls tablet and mobile layout changes.

## Design System

### Visual Direction

YatraAI uses a cinematic travel-brand look:

- dark warm base palette
- gold accent system
- glassy panels and soft borders
- large serif headings with strong contrast
- premium hover and reveal motion
- image-led cards with overlays and gradients

### Core UI Patterns

- `page-hero`: large intro section at the top of every page
- `section-head`: heading plus supporting action row
- `route-card`: general content card for trip info and travel detail
- `workflow-card`: larger content card for multi-step or analytical sections
- `sidebar-card`: smaller supporting card in sidebars and utility areas
- `feature-card`: editorial card used for broad feature storytelling
- `button-primary` and `button-secondary`: main and secondary actions
- `prompt-chip` and `interest-chip`: compact selection chips
- `reveal-on-scroll`: staggered entrance animation for cards and blocks

### Mobile Behavior

On small screens the UI shifts to:

- stacked layouts
- a mobile bottom nav for the core paths
- a hamburger drawer for the full menu
- compact hero spacing
- full-width cards and controls

## Navigation

The header focuses on the main routes:

- Home
- Destinations
- Bookings
- Explorer
- Chat

Other pages live under a single `More` menu:

- Plan Trip
- Travel Partner
- India Map
- Events
- History
- Wishlist
- About
- Privacy

The mobile drawer mirrors the same grouping.

## Page Guide

### Home

File:

- [scripts/pages/home.js](D:/Yatraai/Frontend/scripts/pages/home.js)

What it shows:

- large hero with slide rotation
- swipe gesture support on the hero image
- hero stats and quick jump cards
- featured route storytelling
- feature tiles linking to the rest of the app
- travel partner teaser cards and the partner modal

UI details:

- hero slide text and image crossfade
- pause-on-hover for auto-rotation
- "Surprise me" action that drops into Explorer with a random destination
- travel partner teaser cards that link into the inbox page
- embedded partner matching modal for quick route matching

### Bookings

File:

- [scripts/pages/bookings.js](D:/Yatraai/Frontend/scripts/pages/bookings.js)

What it does:

- keeps flights, hotels, buses, trains, cabs, packages, experiences and Myra in one booking hub
- stores confirmed selections in browser storage
- shows saved bookings as readable cards in the sidebar
- keeps each booking grouped by module, route, summary and reference

UI details:

- framed booking result cards
- compact saved-trip cards
- route, date and status chips
- summary cards for selected items and add-ons

### Destinations

File:

- [scripts/pages/destinations.js](D:/Yatraai/Frontend/scripts/pages/destinations.js)

What it does:

- searches destinations by name, state, region, tags, or blurb
- filters by region, season, and interest
- allows comparing up to three destinations
- supports wishlist toggling from each card
- opens official tourism links and Google Maps links

### Planner

File:

- [scripts/pages/planner.js](D:/Yatraai/Frontend/scripts/pages/planner.js)

What it does:

- builds a trip from start city, destination, transport mode, days, budget, and preferences
- estimates transport cost, stay cost, food cost, activity cost, and total budget
- shows route workflow steps
- draws a map route
- adds dining-aware planning when the trip is restaurant-led
- shows phrasebook and emergency contact cards based on destination state
- supports shareable trip links
- supports read-only restored plans from history or shared URLs

### Chat

File:

- [scripts/pages/chat.js](D:/Yatraai/Frontend/scripts/pages/chat.js)

What it does:

- manages multiple chat sessions in browser storage
- lets users start a new chat
- lets users delete one chat session or clear all chats
- supports prompt chips
- supports voice input when the browser allows it
- can turn the latest assistant reply into a planner trip

### Explorer

File:

- [scripts/pages/explorer.js](D:/Yatraai/Frontend/scripts/pages/explorer.js)

What it does:

- lets users type any featured destination
- shows a detailed overview
- surfaces logistics, season fit, nearby routes, phrasebook, emergency contacts, and weather
- can reuse the current trip destination

### Travel Partner Inbox

File:

- [scripts/pages/partner-inbox.js](D:/Yatraai/Frontend/scripts/pages/partner-inbox.js)

What it does:

- shows a feed of dummy travel partner requests
- filters by solo, group, couple, budget, best-experience and luxury
- lets users search routes, destinations and interests
- opens a connection-request modal

UI details:

- framed hero summary
- step-by-step helper card
- structured route cards
- contact line and interest tags on each card
- featured preview cards on the home page

### Map

File:

- [scripts/pages/map.js](D:/Yatraai/Frontend/scripts/pages/map.js)

What it does:

- renders the India destination map
- lists all featured places in a sidebar
- highlights and pans the map when a list item is hovered or clicked

### Events

File:

- [scripts/pages/events.js](D:/Yatraai/Frontend/scripts/pages/events.js)

What it does:

- shows major travel events and festivals
- toggles between grid view and calendar view

### History

File:

- [scripts/pages/history.js](D:/Yatraai/Frontend/scripts/pages/history.js)

What it does:

- lists current and archived trips
- supports sorting newest/oldest
- supports search
- lets users restore a saved plan back into the planner

### Wishlist

File:

- [scripts/pages/wishlist.js](D:/Yatraai/Frontend/scripts/pages/wishlist.js)

What it does:

- shows all saved wishlist destinations
- lets users remove items
- supports compare mode for two to three destinations
- shows budget range and best season for each place

### About

File:

- [scripts/pages/info.js](D:/Yatraai/Frontend/scripts/pages/info.js)

What it does:

- explains the product mission
- describes the stack
- frames the hackathon story
- explains why the app is India-specific

### Privacy

File:

- [scripts/pages/info.js](D:/Yatraai/Frontend/scripts/pages/info.js)

What it does:

- explains what the app stores locally
- explains what it does not store
- lists third-party services
- describes how to clear browser data
- shows a last-updated date

### 404

File:

- [404.html](D:/Yatraai/Frontend/404.html)

What it does:

- gives users a branded fallback when a link is broken
- offers direct links back to the main app paths

## Shared Behaviors

### Browser State

The app stores:

- current plan
- trip history
- current chat session
- all chat sessions
- wishlist items
- saved bookings
- requested travel-partner connections

All of this lives in browser `localStorage`.

### Shared Enhancements

- offline banner
- back-to-top button
- animated reveals and counters
- view transitions for supported browsers
- destination hover polish
- empty-state illustrations
- home-page partner inbox teaser and modal
- saved booking cards with stored metadata

### Data Flow

The frontend uses:

1. static seed data from `scripts/data/site-data.js`
2. partner request dummy data from `scripts/data/partner-inbox-data.js`
3. browser state from `localStorage`
4. optional live weather and map services
5. optional AI responses from the configured Ollama and backend endpoints

## Accessibility Notes

The UI includes:

- keyboard focus-visible rings
- button and link semantics
- readable contrast in dark mode
- responsive stacking for smaller screens
- empty states that explain what to do next

## Running Locally

Use the repo root `start.bat` to launch the backend and open the app from the same origin.

Example:

```powershell
cd D:\Yatraai
start.bat
```

Then open:

```text
http://localhost:8000/index.html
```

## Important Notes

- do not open `index.html` directly from the filesystem if you want the backend-connected features to work reliably
- browser storage still powers saved plans, history, wishlist, saved bookings and partner requests
- chat, bookings, hotel summaries and translation now depend on the Python backend
- the travel partner inbox uses local dummy data for now and can later be swapped to backend storage

## Suggested Demo Flow

1. Open Home and show the hero, swipe behavior, and "Surprise me"
2. Open Destinations and demonstrate filters, compare mode, and wishlist
3. Open Planner and show route generation, budget, carbon check, and export
4. Open Chat and show sessions, typing indicator, voice input, and save-as-trip
5. Open Bookings and show the saved cards plus module tabs
6. Open the Travel Partner Inbox and show the request cards and filters
7. Open Explorer and show the destination deep-dive cards
8. Open Map and hover the destination list
9. Open History and restore a saved plan
10. Open Wishlist and compare two or three destinations
11. Open About and Privacy to show product framing and polish

## Backend Bridge

The frontend chat, bookings, translation and travel-partner screens now call the FastAPI backend directly where needed. If the backend is not running, those features show an error instead of a demo response.
