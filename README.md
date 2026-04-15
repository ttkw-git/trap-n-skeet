# Trap N Skeet

Trap N Skeet is an installable, offline-capable scorekeeping app for clay target shooting. It runs as a static web app, stores rounds locally in the browser, and can optionally sync completed rounds to Firebase when the user signs in with Google.

## What it does

- Tracks American Trap, Handicap Trap, Skeet, and Olympic Trap rounds.
- Supports standard rounds, Olympic 125-shot competition, and station practice drills.
- Records hit and miss results shot-by-shot with undo support and optional guidance text.
- Shows post-round summaries with station breakdowns and overall rating.
- Keeps round history locally and supports filtering, analytics, CSV export, JSON export, and scorecard image sharing.
- Works offline through a service worker and can be installed as a PWA on desktop or mobile.

## Supported modes

| Discipline | Modes | Notes |
|---|---|---|
| American Trap | Standard 25, Station Practice | 5 stations, 25 shots in standard mode |
| Handicap Trap | 25-shot round with yardage selector | Yardage is adjustable in the home screen |
| Skeet | Competition 25, Station Practice | Includes singles, doubles, and the skeet option rule |
| Olympic Trap | Practice 25, Competition 125, Station Practice | Competition mode is five 25-shot rounds |

### Skeet option rule

On the first miss in a skeet round, the app inserts an immediate reshoot of that same target and still keeps the round at 25 shots. If no miss occurs before the end of the regular sequence, the 25th shot is Station 7 Low House.

## Main features

- Sign in with Google or continue without an account.
- Local-first storage with `localStorage` as the primary data store.
- Cloud sync with Firebase Auth and Firestore for signed-in users.
- Automatic cloud pull on sign-in, when the app comes back online, and on a timed refresh.
- History filters for discipline, date range, percentage threshold, text query, and practice rounds.
- Analytics view with trend lines, moving average, personal best, and station-by-station performance.
- Share a finished round as a generated PNG scorecard.
- Export filtered history to CSV or JSON.
- Installable PWA with offline asset caching.

## Tech stack

| Layer | Technology |
|---|---|
| UI | HTML, CSS, vanilla JavaScript ES modules |
| Persistence | Browser `localStorage` |
| Sync | Firebase Authentication and Cloud Firestore |
| Offline | Service worker cache |
| Distribution | Static site / PWA |

## Running locally

This app must be served over HTTP. Opening [index.html](index.html) directly from disk will not work because the app uses ES modules and a service worker.

### Windows quick start

Run [launch.bat](launch.bat). It starts a local Python HTTP server on `http://localhost:8765` and opens the browser.

### Manual start

From the repository root:

```bash
python -m http.server 8765
```

Then open `http://localhost:8765`.

Any static file server will also work.

## Firebase and sync

The repository is already wired to a Firebase project in [js/firebase.js](js/firebase.js). That means Google sign-in and Firestore sync will target that configured project unless you replace the Firebase config with your own.

Current sync behavior:

- Local storage is always authoritative for offline use.
- Completed rounds are pushed to Firestore after the round finishes.
- On sign-in, cloud rounds are pulled and merged into local storage.
- If the cloud is empty, the app uploads completed local rounds.
- Clearing history removes both local data and the signed-in user's cloud rounds.

## PWA and deployment notes

The manifest in [manifest.json](manifest.json) is currently scoped to `/trap-n-skeet/`, which matches a GitHub Pages project-site style deployment. If you deploy under a different path, update `start_url` and `scope` to match your hosting location.

The service worker in [service-worker.js](service-worker.js) caches the core app shell and excludes Firebase CDN requests from caching so auth and Firestore SDK requests stay fresh.

## Project structure

```text
Trap_N_Skeet/
|-- index.html
|-- manifest.json
|-- service-worker.js
|-- launch.bat
|-- README.md
|-- css/
|   |-- components.css
|   `-- theme.css
|-- icons/
|   |-- generate-icons.js
|   |-- generate-icons.py
|   |-- icon-192.png
|   |-- icon-512.png
|   `-- icon.svg
`-- js/
    |-- app.js
    |-- export.js
    |-- firebase.js
    |-- share.js
    |-- storage.js
    |-- sync.js
    |-- utils.js
    |-- disciplines/
    |   |-- american-trap.js
    |   |-- olympic-trap.js
    |   |-- skeet.js
    |   `-- station-practice.js
    `-- screens/
        |-- analytics.js
        |-- history.js
        |-- home.js
        |-- shooting.js
        `-- summary.js
```

## File guide

- [index.html](index.html): Single-page app shell with all major screens.
- [js/app.js](js/app.js): Boot logic, router, auth screen flow, and sync indicator updates.
- [js/screens/home.js](js/screens/home.js): Discipline selection, settings, handicap yardage, and station practice setup.
- [js/screens/shooting.js](js/screens/shooting.js): Active round logic, diagrams, hit or miss recording, undo, and early finish.
- [js/screens/summary.js](js/screens/summary.js): Final score, rating, station breakdown, and share action.
- [js/screens/history.js](js/screens/history.js): History list, filters, stats, and exports.
- [js/screens/analytics.js](js/screens/analytics.js): Trend chart and station performance analytics.
- [js/storage.js](js/storage.js): Round persistence, settings persistence, and analytics data shaping.
- [js/sync.js](js/sync.js): Firebase authentication and round synchronization.
- [js/share.js](js/share.js): PNG scorecard rendering and native share or download fallback.

## Notes for maintenance

- If you change cached assets, bump the cache name in [service-worker.js](service-worker.js).
- If you deploy anywhere other than `/trap-n-skeet/`, update the manifest path settings.
- If you fork this project and want your own backend, replace the Firebase config and apply your own Firestore security rules.
