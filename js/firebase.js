// ═══════════════════════════════════════════════
// firebase.js — Firebase init + exports
//
// NOTE: The apiKey is NOT a secret — it is safe to
// expose in client-side code. Security is enforced
// by Firestore security rules on the server side.
// ═══════════════════════════════════════════════

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyD-LttnUAA6hIlmz7kxRlHgDkttbEC43Ts',
  authDomain:        'trap-n-skeet.firebaseapp.com',
  projectId:         'trap-n-skeet',
  storageBucket:     'trap-n-skeet.firebasestorage.app',
  messagingSenderId: '458602579123',
  appId:             '1:458602579123:web:401e1bb441221f6e509cc6',
};

const app      = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged,
  doc, setDoc, getDoc, getDocs, deleteDoc, collection, writeBatch,
};
