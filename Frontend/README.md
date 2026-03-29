# YatraAI Frontend README

## Overview

This folder contains the modular website frontend for YatraAI.

It is now organized into separate `scripts/` and `styles/` folders so the project is easier to navigate, explain, and extend during a hackathon.

The frontend includes:

- homepage
- destinations page
- events page
- planner page
- AI chat page
- explorer page
- India map page
- trip history page

## Folder Structure

### [scripts](/D:/Yatraai/Frontend/scripts)

JavaScript modules for the frontend.

Important files:

- [main.js](/D:/Yatraai/Frontend/scripts/main.js)
- [config.js](/D:/Yatraai/Frontend/scripts/core/config.js)
- [state.js](/D:/Yatraai/Frontend/scripts/core/state.js)
- [site-data.js](/D:/Yatraai/Frontend/scripts/data/site-data.js)

### [styles](/D:/Yatraai/Frontend/styles)

CSS split into multiple files:

- [main.css](/D:/Yatraai/Frontend/styles/main.css)
- [base.css](/D:/Yatraai/Frontend/styles/base.css)
- [layout.css](/D:/Yatraai/Frontend/styles/layout.css)
- [sections.css](/D:/Yatraai/Frontend/styles/sections.css)
- [responsive.css](/D:/Yatraai/Frontend/styles/responsive.css)

### HTML Entry Files

- [index.html](/D:/Yatraai/Frontend/index.html)
- [destinations.html](/D:/Yatraai/Frontend/destinations.html)
- [events.html](/D:/Yatraai/Frontend/events.html)
- [planner.html](/D:/Yatraai/Frontend/planner.html)
- [chat.html](/D:/Yatraai/Frontend/chat.html)
- [explorer.html](/D:/Yatraai/Frontend/explorer.html)
- [map.html](/D:/Yatraai/Frontend/map.html)
- [history.html](/D:/Yatraai/Frontend/history.html)

## Current Frontend Features

- editorial-style homepage
- destination library with search and region filtering
- top events page
- planner with route summary and map
- Google Maps action links
- larger AI chat interface
- explorer page with typed place search
- history stored in browser localStorage
- India destination map with Leaflet/OpenStreetMap

## Current Data Flow

Today the frontend uses two kinds of data:

1. Static UI data from `scripts/data/site-data.js`
2. Dynamic local browser state from `localStorage`

For AI:

- local development points to `http://localhost:11434/api/generate`
- deployed mode expects `/api/ollama`

Important note:

- the frontend is prepared for backend/API integration
- but a real production backend proxy is still needed for safe public deployment

## How To Run Locally

Because this is a static frontend, you can serve it with any simple local server.

Quickest option:

```text
Double-click Frontend/start-frontend.bat
```

Then open:

```text
http://localhost:5500
```

Example using Python:

```powershell
cd D:\Yatraai\Frontend
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

Important:

- do not open `index.html` directly by double-click
- after the modular JS refactor, the frontend should be served through a local server
- otherwise the browser may show a blank page because ES module imports are blocked on `file://`

## Publishability Notes

For public deployment, recommended setup is:

- host the frontend on Vercel, Netlify, GitHub Pages, or a similar platform
- expose backend endpoints separately
- proxy Ollama through a backend service instead of exposing localhost logic directly

## GitHub Pages Hosting

This project is now prepared for GitHub Pages deployment with:

- [deploy-pages.yml](/D:/Yatraai/.github/workflows/deploy-pages.yml)

What it does:

- deploys the `Frontend/` folder
- publishes on pushes to the `main` branch
- uses GitHub Actions Pages deployment

Important limitation:

- GitHub Pages can host the frontend only
- the Ollama-powered backend will not run on GitHub Pages
- on the public Pages site, AI features need a separate hosted backend if you want live responses

## Recommended Next Step

To make this production-ready:

1. move travel responses behind a backend API
2. move static destination/event data into backend-managed JSON or database storage
3. keep the frontend as the presentation layer only
