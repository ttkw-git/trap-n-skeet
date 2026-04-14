// ═══════════════════════════════════════════════
// app.js — Application entry point & router
// ═══════════════════════════════════════════════

import { initHome,     onEnter as homeEnter     } from './screens/home.js';
import { initShooting, onEnter as shootingEnter } from './screens/shooting.js';
import { initSummary,  onEnter as summaryEnter  } from './screens/summary.js';
import { initHistory,  onEnter as historyEnter  } from './screens/history.js';
import { initAnalytics, onEnter as analyticsEnter } from './screens/analytics.js';
import { initSync, signInGoogle, signOutUser, onUserChange, onSyncStatusChange, onSyncMetaChange, getCurrentUser, getLastSyncedAt, getSyncStatus }
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
  analytics: document.getElementById('screen-analytics'),
};

const onEnterFns = {
  signin:   () => {},
  home:     homeEnter,
  settings: () => {},
  shooting: shootingEnter,
  summary:  summaryEnter,
  history:  historyEnter,
  analytics: analyticsEnter,
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
  const textEl = document.getElementById('sync-indicator-text');
  const user = getCurrentUser();

  el.className = 'sync-indicator';

  if (!user || status === 'idle') {
    el.classList.add('hidden');
    textEl.classList.add('hidden');
    return;
  }

  el.classList.remove('hidden');
  el.classList.add(status);

  const lastSyncedAt = getLastSyncedAt();
  const statusLabel = { syncing: 'Syncing...', synced: 'Synced', error: 'Sync error' }[status] || 'Sync';
  const detail = formatSyncDetail(lastSyncedAt);

  el.title = `${statusLabel}${detail ? ` (${detail})` : ''}`;
  textEl.textContent = `${statusLabel}${detail ? ` · ${detail}` : ''}`;
  textEl.classList.remove('hidden');
}

function formatSyncDetail(lastSyncedAt) {
  if (!navigator.onLine) return 'Offline';
  if (!lastSyncedAt) return 'Not yet';
  return `Last ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function updateSettingsSyncStatus(status, lastSyncedAt) {
  const el = document.getElementById('settings-sync-status');
  const user = getCurrentUser();
  if (!user) {
    el.textContent = '';
    return;
  }

  const label = { syncing: 'Syncing...', synced: 'Synced', error: 'Sync error', idle: 'Idle' }[status] || 'Sync';
  const detail = formatSyncDetail(lastSyncedAt);
  el.textContent = detail ? `${label} · ${detail}` : label;
}

// ── Auth state → UI ────────────────────────────

function updateAuthUI(user) {
  // Sync indicator visibility
  const indicator = document.getElementById('sync-indicator');
  if (!user) {
    indicator.classList.add('hidden');
    document.getElementById('sync-indicator-text').classList.add('hidden');
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
  onAnalytics: () => navigate('analytics'),
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

initAnalytics({
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
onSyncMetaChange(({ status, lastSyncedAt }) => {
  updateSettingsSyncStatus(status, lastSyncedAt);
});

window.addEventListener('online', () => {
  const status = getSyncStatus();
  updateSyncIndicator(status);
  updateSettingsSyncStatus(status, getLastSyncedAt());
});
window.addEventListener('offline', () => {
  const status = getSyncStatus();
  updateSyncIndicator(status);
  updateSettingsSyncStatus(status, getLastSyncedAt());
});

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
