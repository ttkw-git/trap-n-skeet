# Trap N Skeet

A Progressive Web App (PWA) for tracking shotgun shooting scores across three competitive clay shooting disciplines. Works offline, installs on any device, and optionally syncs rounds across devices via Google sign-in.

---

## Features

- **Three disciplines** — American Trap, Skeet, and Olympic Trap
- **Live shot tracking** — progress bar, station labels, and contextual guidance on every shot
- **Hit / Miss recording** with haptic vibration feedback (50 ms on hit, pulse pattern on miss)
- **Undo** — step back through any shot in the current round
- **Post-round summary** — score, percentage, performance rating, and a station-by-station breakdown
- **History & stats** — full round history filterable by discipline, date range, minimum score %, and text search; best score and average per discipline
- **Analytics** — score trend chart with moving average and personal-best lines, plus station-by-station hit % bars; filterable by discipline and time window (30 / 60 / 90 days)
- **Data export** — download filtered history as CSV or JSON for analysis/backups
- **Google sign-in + cloud sync** — Firebase Firestore mirrors rounds across all your devices; manual "Sync Now" button plus auto-sync on reconnect, every 5 minutes, and when the tab regains focus
- **Offline-first** — Service Worker caches the app so it works without a network connection
- **PWA installable** — add to Home Screen on iOS/Android or install via desktop browser

---

## Disciplines

| Discipline | Stations | Total Shots | Shot Types | Notes |
|---|---|---|---|---|
| American Trap | 5 | 25 | Singles | 5 shots per station; targets angle left, straight, or right depending on station |
| Skeet | 8 | 25 | Singles + Doubles | Doubles at stations 1, 2, 6, 7; **option rule** on first miss (see below) |
| Olympic Trap | 6 | 25 or 125 | Singles | Shooter cycles 1→2→…→6→1; Practice (25) or Competition (5 rounds of 25) |

### Skeet Option Rule
On the **first miss** of a Skeet round the app immediately injects a reshoot of that exact target as the very next shot, removing the placeholder 25th shot to keep the round at 25 shots. If you go clean through shot 24, the 25th shot is a Station 7 Low House single.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript (ES6 modules), HTML5, CSS3 |
| Backend | Firebase Authentication (Google Sign-in), Cloud Firestore |
| Offline | Service Worker (cache-first strategy) |
| Persistence | localStorage (primary) + Firestore (cloud mirror) |
| PWA | Web App Manifest, installable on iOS / Android / desktop |

---

## Getting Started

The app must be served over HTTP — opening `index.html` directly as a `file://` URL will not work because ES modules and the Service Worker require an HTTP origin.

### Option 1 — Python (macOS / Linux / Windows)

```bash
# From the repo root
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

### Option 2 — Windows batch file

Double-click `launch.bat` in the repo root. It starts the Python server and opens the browser automatically.

### Option 3 — Any static file server

Serve the repo root with any HTTP server (e.g. `npx serve .`, `npx http-server .`, VS Code Live Server, etc.).

---

## PWA Installation

| Platform | Steps |
|---|---|
| **iOS (Safari)** | Open the app URL → tap the Share icon → "Add to Home Screen" |
| **Android (Chrome)** | Open the app URL → tap the three-dot menu → "Add to Home screen" |
| **Desktop (Chrome / Edge)** | Open the app URL → click the install icon in the address bar |

---

## Project Structure

```
trap-n-skeet/
├── index.html              # Single-page app — all screens as <div> sections
├── manifest.json           # PWA manifest (name, icons, theme colour)
├── service-worker.js       # Offline cache strategy, Firebase CDN bypass
├── launch.bat              # Windows quick-start launcher
│
├── css/
│   ├── theme.css           # CSS variables, dark theme, fluid typography
│   └── components.css      # All UI component styles
│
├── js/
│   ├── app.js              # Screen router, auth state, sync indicator
│   ├── sync.js             # Firebase Auth + Firestore push/pull/merge
│   ├── storage.js          # localStorage read/write helpers
│   ├── firebase.js         # Firebase SDK initialisation
│   ├── utils.js            # Formatting, vibration, confirm dialog
│   ├── export.js           # CSV / JSON export helpers for round history
│   │
│   ├── disciplines/
│   │   ├── american-trap.js    # AmericanTrapEngine — 5×5 shot sequence
│   │   ├── skeet.js            # SkeetEngine — singles/doubles + option rule
│   │   └── olympic-trap.js     # OlympicTrapEngine — practice / competition modes
│   │
│   └── screens/
│       ├── home.js         # Home screen, discipline/mode selection, settings
│       ├── shooting.js     # Active round UI — hit/miss buttons, undo, exit
│       ├── summary.js      # Post-round results and station breakdown
│       ├── history.js      # Round history list, filters, stats, and export
│       └── analytics.js    # Trend chart, moving average, station hit % bars
│
└── icons/
    ├── icon.svg            # Source vector icon
    ├── icon-192.png        # PWA icon (192 × 192)
    └── icon-512.png        # PWA icon (512 × 512)
```
