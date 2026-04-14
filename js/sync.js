// ═══════════════════════════════════════════════
// sync.js — Firebase Auth + Firestore sync
//
// Strategy:
//  • localStorage is always the primary store (works offline)
//  • Firestore is the cloud mirror (synced when online + signed in)
//  • On sign-in: pull all cloud rounds → merge into localStorage
//  • On round complete: push to Firestore (non-blocking)
//  • Merge rule: cloud wins on conflict if round is completed and
//    local copy is not, otherwise keep the one with latest startedAt
// ═══════════════════════════════════════════════

import {
  auth, db, googleProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged,
  doc, setDoc, getDocs, collection,
} from './firebase.js';

import { loadAllRounds, saveRound as saveLocal } from './storage.js';

// ── Internal state ─────────────────────────────
let _currentUser   = null;
let _authListeners = [];  // callbacks: (user) => void
let _syncStatus    = 'idle'; // 'idle' | 'syncing' | 'synced' | 'error'
let _statusListeners = [];

// ── Auth listeners ─────────────────────────────

/** Register a callback fired whenever auth state changes. */
export function onUserChange(callback) {
  _authListeners.push(callback);
  // Fire immediately with current state
  callback(_currentUser);
}

/** Register a callback fired when sync status changes. */
export function onSyncStatusChange(callback) {
  _statusListeners.push(callback);
  callback(_syncStatus);
}

function setSyncStatus(status) {
  _syncStatus = status;
  _statusListeners.forEach(fn => fn(status));
}

// ── Bootstrap ──────────────────────────────────

/**
 * Called once on app startup. Handles both the initial auth check
 * AND the redirect result if we returned from a Google sign-in redirect.
 */
export async function initSync() {
  // Handle redirect sign-in result (mobile Safari fallback)
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      // User just came back from Google redirect — auth state will fire below
    }
  } catch (err) {
    console.warn('Redirect result error:', err);
  }

  // Subscribe to auth state changes
  onAuthStateChanged(auth, async (user) => {
    _currentUser = user;
    _authListeners.forEach(fn => fn(user));
    if (user) {
      await pullFromCloud();
    }
  });
}

// ── Sign in / out ──────────────────────────────

export async function signInGoogle() {
  try {
    // Try popup first (works on desktop + PWA mode on iOS)
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
      // Fall back to redirect (plain Safari browser, not PWA)
      await signInWithRedirect(auth, googleProvider);
    } else {
      throw err;
    }
  }
}

export async function signOutUser() {
  await signOut(auth);
  setSyncStatus('idle');
}

export function getCurrentUser() {
  return _currentUser;
}

export function getSyncStatus() {
  return _syncStatus;
}

// ── Cloud write ────────────────────────────────

/**
 * Push a single round to Firestore.
 * Called after each completed round.
 * Silent fail — if offline or error, local data is still safe.
 */
export async function saveRoundToCloud(round) {
  if (!_currentUser) return;
  try {
    setSyncStatus('syncing');
    const ref = doc(db, 'users', _currentUser.uid, 'rounds', round.id);
    await setDoc(ref, round);
    setSyncStatus('synced');
  } catch (err) {
    console.warn('Cloud save failed (data is safe locally):', err.message);
    setSyncStatus('error');
  }
}

// ── Cloud read ─────────────────────────────────

/**
 * Pull all rounds from Firestore and merge into localStorage.
 * Called automatically on sign-in.
 */
export async function pullFromCloud() {
  if (!_currentUser) return;
  try {
    setSyncStatus('syncing');
    const snapshot = await getDocs(
      collection(db, 'users', _currentUser.uid, 'rounds')
    );

    if (snapshot.empty) {
      // No cloud data — push all local rounds to cloud instead
      await pushAllToCloud();
      setSyncStatus('synced');
      return;
    }

    const localRounds = loadAllRounds();
    const localMap    = Object.fromEntries(localRounds.map(r => [r.id, r]));

    let mergeCount = 0;
    snapshot.forEach(docSnap => {
      const remote = docSnap.data();
      const local  = localMap[remote.id];
      if (!local) {
        // Round only exists in cloud → save locally
        saveLocal(remote);
        mergeCount++;
      } else if (!local.completedAt && remote.completedAt) {
        // Cloud has a completed version, local does not → use cloud
        saveLocal(remote);
        mergeCount++;
      }
      // Otherwise keep local (already have it)
    });

    // Push any local rounds that aren't in the cloud yet
    const cloudIds = new Set(snapshot.docs.map(d => d.id));
    const toUpload = localRounds.filter(r => r.completedAt && !cloudIds.has(r.id));
    for (const round of toUpload) {
      const ref = doc(db, 'users', _currentUser.uid, 'rounds', round.id);
      await setDoc(ref, round);
    }

    setSyncStatus('synced');
    if (mergeCount > 0) {
      // Notify app that history has new data (dispatch a custom event)
      window.dispatchEvent(new CustomEvent('trapnskeet:synced', { detail: { mergeCount } }));
    }
  } catch (err) {
    console.warn('Cloud pull failed:', err.message);
    setSyncStatus('error');
  }
}

/** Upload every completed local round to Firestore (first-time sync). */
async function pushAllToCloud() {
  const rounds = loadAllRounds().filter(r => r.completedAt);
  for (const round of rounds) {
    const ref = doc(db, 'users', _currentUser.uid, 'rounds', round.id);
    await setDoc(ref, round);
  }
}
