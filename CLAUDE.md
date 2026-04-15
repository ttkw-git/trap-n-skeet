# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Development Server:**
```bash
python -m http.server 8765
# Then visit http://localhost:8765
```

On Windows, use:
```bash
launch.bat
```

The app runs as a static site with no build step—ES modules and the service worker require HTTP serving (cannot open `index.html` directly).

## Project Overview

Trap N Skeet is a **local-first PWA** for clay target shooting scorekeeping. It prioritizes offline capability, supports four disciplines (American Trap, Handicap Trap, Skeet, Olympic Trap), and optionally syncs completed rounds to Firebase.

**Core constraints:**
- Vanilla HTML/CSS/JavaScript (ES modules only)
- No frameworks, no build tooling
- `localStorage` is always authoritative for offline use
- Firebase sync is optional and additive
- Installable as a PWA with offline service worker caching

## High-Level Architecture

### Data Flow
1. **Home screen** → user selects discipline, yardage, or practice mode
2. **Shooting screen** → app instantiates a discipline rules object, records shots, manages undo
3. **Summary screen** → displays final score and rating, computed from the round object
4. **History screen** → retrieves all past rounds from `localStorage`, applies filters, exports, shares
5. **Analytics screen** → shapes historical data into trend lines and station breakdowns
6. **Firebase sync** → when user signs in, pulls cloud rounds and merges them into local storage; pushes completed rounds to Firestore

### Module Organization

| Module | Responsibility |
|--------|-----------------|
| `js/app.js` | App boot, router, screen visibility toggle, auth flow, sync status indicators |
| `js/screens/*` | Screen-specific UI logic (home, shooting, summary, history, analytics) |
| `js/disciplines/*` | Shot sequencing, rule interpretation, and round structure for each discipline |
| `js/storage.js` | `localStorage` persistence, analytics data shaping, history retrieval and filtering |
| `js/sync.js` | Firebase auth, Firestore round push/pull, user state management |
| `js/share.js` | PNG scorecard rendering for native share/download |
| `js/export.js` | CSV and JSON exports of round history |
| `js/utils.js` | Shared utilities (date formatting, etc.) |
| `index.html` | Single app shell with screen containers and static UI structure |
| `service-worker.js` | Offline caching of app assets (excludes Firebase CDN) |

### Key Data Structures

**Round object** (stored in `localStorage` and Firestore):
```js
{
  id: 'unique-id',
  discipline: 'american-trap' | 'handicap-trap' | 'skeet' | 'olympic-trap',
  mode: 'standard' | 'competition' | 'practice', // discipline-specific
  date: ISO-8601-timestamp,
  shots: [
    { station: 1, target: 'singles', result: 'hit' | 'miss', ... },
    // ... one entry per shot
  ],
  final_score: number,
  notes: string,
  synced: boolean, // true if pushed to Firestore
}
```

**Discipline interface** (in `js/disciplines/*.js`):
- Constructor takes discipline options
- `nextShotInfo()` → returns current station, target type, guidance text
- `recordShot(result)` → updates internal state, returns shot object
- `undo()` → reverts last shot
- `isFinished()` → boolean
- `getScore()` → returns final score object with breakdowns

### Screen Lifecycle

Screens are instantiated once during boot (in `index.html`) and reused:
1. `init*()` function builds DOM elements and attaches event listeners
2. `onEnter(params)` function updates UI when the screen becomes visible
3. Screens share data via `storage.js` and `sync.js` imports; no global state

### Storage and Sync Safety

- **Local storage is always authoritative** for offline operation
- Round objects have a `synced` flag to track cloud state
- On sign-in: fetch cloud rounds, merge with local history (no duplicates, keep local if conflict)
- On clear history: delete both local `localStorage` and user's Firestore collection
- Discipline and scoring changes must maintain consistency across summary, history, analytics, export, and share outputs

### PWA and Deployment

- Service worker caches the app shell; Firebase CDN requests are excluded to stay fresh
- `manifest.json` currently targets `/trap-n-skeet/` path (GitHub Pages style)
- If deploying elsewhere, update `manifest.json` `start_url` and `scope` to match the actual deployment base path
- If cached assets change, bump the cache name in `service-worker.js` to force refresh

## Common Development Patterns

### Adding a new screen
1. Create `js/screens/my-screen.js` with `initMyScreen()` and `onEnter(params)` functions
2. Export them and import in `app.js`
3. Add container `<div id="screen-my-screen" class="screen hidden">` in `index.html`
4. Register in `screenEls` and `onEnterFns` objects in `app.js`
5. Call `navigate('my-screen', params)` to show it

### Adding discipline rules
1. Create `js/disciplines/my-discipline.js` with a class or factory that implements the discipline interface
2. Import and instantiate in `js/screens/home.js` when user selects that discipline
3. Pass the discipline instance to the shooting screen
4. Test round completion, undo, and score calculation

### Accessing round history
```js
import { getRounds, addRound, updateRound } from './storage.js';

// Retrieve all rounds
const rounds = getRounds();

// Add a completed round
addRound(roundObj);

// Get rounds with filters
const filtered = getRounds({ 
  discipline: 'skeet', 
  minDate: new Date(2025, 0, 1),
  maxDate: new Date(2025, 3, 1)
});
```

### Handling Firebase sync
```js
import { onUserChange, pullFromCloud, getSyncStatus } from './sync.js';

// React to auth changes
onUserChange((user) => {
  if (user) {
    pullFromCloud(); // Merge cloud rounds into local storage
  }
});

// Check sync status
const status = getSyncStatus(); // 'idle' | 'syncing' | 'error'
```

## Important Invariants

**Do not alter without explicit request:**
- Shot ordering or rules for disciplines
- Round structure (25 shots for standard American Trap, Skeet, Handicap; 125 for Olympic competition)
- Public function signatures, export names, HTML element IDs, or `localStorage` keys
- Screen flow (home → shooting → summary → history/analytics)
- Accessibility basics (semantic labels, contrast, keyboard navigation)

**Changes must maintain:**
- Consistency across summary, history, analytics, export, and share views
- Offline-first behavior and PWA cacheability
- Backwards compatibility with existing stored round shapes (use migrations for schema changes)

## Before Making Changes

1. **Read the relevant files first** — especially the screen or discipline being modified, plus storage.js if data changes
2. **Make minimum coherent edits** — avoid broad refactors unless requested
3. **Verify no regressions** in: round entry, undo, summary display, history/analytics retrieval, export/share, offline load
4. **Check .cursorrules** for coding style and naming conventions

## Code Style

- Match the current style in touched files (indentation, naming, comment format)
- Keep functions focused; extract helpers only if it reduces repeated logic
- Use concise comments only for non-obvious logic
- Preserve ES module boundaries and single-responsibility module structure
