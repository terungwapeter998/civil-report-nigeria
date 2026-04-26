import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * CIVICREPORT NIGERIA
 * STAGE 6 FIREBASE BOUNDARY LAYER
 * --------------------------------
 * This file MUST remain:
 * - stateless
 * - deterministic
 * - configuration-only
 */

// =========================
// FIREBASE CONFIG (STATIC)
// =========================
// NOTE: In production, this should be environment-injected via server,
// not hardcoded in frontend. This is a known exposure risk if left here.

const firebaseConfig = {
    apiKey: "REPLACE_WITH_SECURE_SERVER_INJECTION",
    authDomain: "civicreport-nigeria.firebaseapp.com",
    projectId: "civicreport-nigeria",
    storageBucket: "civicreport-nigeria.appspot.com",
    messagingSenderId: "REPLACE",
    appId: "REPLACE"
};

// =========================
// INITIALIZATION (SINGLETON)
// =========================

const app = initializeApp(firebaseConfig);

/**
 * AUTH LAYER EXPORT
 * - No logic
 * - No session handling
 * - Pure SDK exposure only
 */
const auth = getAuth(app);

/**
 * DATABASE LAYER EXPORT
 * - Firestore is treated as raw persistence engine only
 * - All governance rules MUST be enforced outside this file
 */
const db = getFirestore(app);

// =========================
// EXPORT CONTRACT (IMMUTABLE SURFACE)
// =========================

export { app, auth, db };