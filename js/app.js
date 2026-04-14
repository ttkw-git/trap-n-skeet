// ═══════════════════════════════════════════════
// app.js — Application entry point & router
// ═══════════════════════════════════════════════

import { initHome,     onEnter as homeEnter     } from './screens/home.js';
import { initShooting, onEnter as shootingEnter } from './screens/shooting.js';
import { initSummary,  onEnter as summaryEnter  } from './screens/summary.js';
import { initHistory,  onEnter as historyEnter  } from './screens/history.js';
import { initSync, signInGoogle, signOutUser, onUserChange, onSyncStatusChange, getCurrentUser }
  from './sync.js';

// ── Register Service Worker ────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}

// ── Screen registry ────────────────────────────
const screenEls = {
  signin:   document.getElementById('screen-signin'),
  home:     document.getElementById('screen-home'),
  settings: document.getElementById('screen-settings'),
  shooting: document.getElementById('screen-shooting'),
  summary:  document.getElementById('screen-summary'),
  history:  document.getElementById('screen-history'),
};

const onEnterFns = {
  signin:   () => {},
  home:     homeEnter,
  settings: () => {},
  shooting: shootingEnter,
  summary:  summaryEnter,
  history:  historyEnter,
};

let currentScreen = null;

export function navigate(screenName, params = {}) {
  if (currentScreen) screenEls[currentScreen]?.classList.add('hidden');
  const el = screenEls[screenName];
  if (!el) { console.error(`Unknown screen: ${screenName}`); return; }
  el.classList.remove('hidden');
  currentScreen = screenName;
  onEnterFns[screenName]?.(params);
}

// ── Sign-in screen ─────────────────────────────

function initSignInScreen() {
  document.getElementById('btn-google-signin').addEventListener('click', async () => {
    const errEl = document.getElementById('signin-error');
    errEl.classList.add('hidden');
    try {
      await signInGoogle();
      // onUserChange will fire → navigate to home
    } catch (err) {
      errEl.textContent = 'Sign-in failed. Please try again.';
      errEl.classList.remove('hidden');
    }
  });

  document.getElementById('btn-skip-signin').addEventListener('click', () => {
    // Mark that the user consciously chose to skip
    sessionStorage.setItem('trapnskeet_skip_signin', '1');
    navigate('home');
  });
}

// ── Sync status indicator ──────────────────────

function updateSyncIndicator(status) {
  const el = document.getElementById('sync-indicator');
  el.className = 'sync-indicator';
  if (status === 'idle') {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.classList.add(status);
  el.title = { syncing: 'Syncing…', synced: 'Synced ✓', error: 'Sync error' }[status] || '';
}

// ── Auth state → UI ────────────────────────────

function updateAuthUI(user) {
  // Sync indicator visibility
  const indicator = document.getElementById('sync-indicator');
  if (!user) {
    indicator.classList.add('hidden');
  }

  // Settings screen account section
  const signedIn  = document.getElementById('settings-signed-in');
  const signedOut = document.getElementById('settings-signed-out');

  if (user) {
    signedIn.classList.remove('hidden');
    signedOut.classList.add('hidden');

    // Avatar: photo if available, else first letter of name
    const avatar = document.getElementById('settings-avatar');
    if (user.photoURL) {
      avatar.innerHTML = `<img src="${user.photoURL}" alt="">`;
    } else {
      avatar.textContent = (user.displayName || user.email || '?')[0].toUpperCase();
    }
    document.getElementById('settings-user-name').textContent  = user.displayName || '';
    document.getElementById('settings-user-email').textContent = user.email || '';
  } else {
    signedIn.classList.add('hidden');
    signedOut.classList.remove('hidden');
  }

  // If on sign-in screen and now signed in → go to home
  if (user && currentScreen === 'signin') {
    navigate('home');
  }
}

// ── Wire up cross-screen navigation ───────────

initHome({
  onStart:   (params) => navigate('shooting', params),
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

initSignInScreen();

// Settings back button
document.getElementById('btn-settings-back').addEventListener('click', () => {
  navigate('home');
});
document.getElementById('btn-sign-out').addEventListener('click', async () => {
  await signOutUser();
  navigate('home');
});
document.getElementById('btn-settings-signin').addEventListener('click', async () => {
  try { await signInGoogle(); } catch (_) {}
});

// Listen for cloud sync completing — refresh history if open
window.addEventListener('trapnskeet:synced', () => {
  if (currentScreen === 'history') historyEnter();
});

// ── Subscribe to auth + sync state ────────────
onUserChange(updateAuthUI);
onSyncStatusChange(updateSyncIndicator);

// ── Boot ───────────────────────────────────────
async function boot() {
  // Start Firebase auth listener (also handles Google redirect result)
  await initSync();

  const user        = getCurrentUser();
  const skipSignIn  = sessionStorage.getItem('trapnskeet_skip_signin');
  const hasSeenAuth = localStorage.getItem('trapnskeet_seen_auth');

  if (user) {
    // Already signed in
    navigate('home');
  } else if (hasSeenAuth || skipSignIn) {
    // User has seen the sign-in prompt before and chose to skip
    navigate('home');
  } else {
    // First time — show sign-in screen
    navigate('signin');
    localStorage.setItem('trapnskeet_seen_auth', '1');
  }
}

boot();
