// ═══════════════════════════════════════════════
// app.js — Application entry point & router
// ═══════════════════════════════════════════════

import { initHome,     onEnter as homeEnter     } from './screens/home.js';
import { initShooting, onEnter as shootingEnter } from './screens/shooting.js';
import { initSummary,  onEnter as summaryEnter  } from './screens/summary.js';
import { initHistory,  onEnter as historyEnter  } from './screens/history.js';

// ── Register Service Worker ────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {
    // SW registration failure is non-fatal (e.g. file:// origin)
  });
}

// ── Screen registry ────────────────────────────
const screenEls = {
  home:     document.getElementById('screen-home'),
  settings: document.getElementById('screen-settings'),
  shooting: document.getElementById('screen-shooting'),
  summary:  document.getElementById('screen-summary'),
  history:  document.getElementById('screen-history'),
};

const onEnterFns = {
  home:     homeEnter,
  settings: () => {},    // settings is initialized inline in home.js
  shooting: shootingEnter,
  summary:  summaryEnter,
  history:  historyEnter,
};

let currentScreen = null;

/** Navigate to a named screen, passing optional params to its onEnter handler. */
export function navigate(screenName, params = {}) {
  if (currentScreen) {
    screenEls[currentScreen]?.classList.add('hidden');
  }
  const el = screenEls[screenName];
  if (!el) {
    console.error(`Unknown screen: ${screenName}`);
    return;
  }
  el.classList.remove('hidden');
  currentScreen = screenName;
  onEnterFns[screenName]?.(params);
}

// ── Wire up cross-screen navigation ───────────

initHome({
  onStart: (params) => navigate('shooting', params),
  onHistory: () => navigate('history'),
});

initShooting({
  onDone: ({ round, engine }) => navigate('summary', { round, engine }),
});

initSummary({
  onShootAgain: () => navigate('home'),
  onHistory:    () => navigate('history'),
});

initHistory({
  onBack: () => navigate('home'),
});

// ── Boot ───────────────────────────────────────
navigate('home');
