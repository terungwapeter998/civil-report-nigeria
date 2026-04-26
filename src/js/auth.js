import { auth } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/**
 * CIVICREPORT NIGERIA
 * STAGE 6 AUTH APPLICATION LAYER
 * --------------------------------
 * RULES:
 * - UI is NOT trusted
 * - Every action is an event intent
 * - Backend/Firestore rules are final authority
 */

// =========================
// SAFE INPUT NORMALIZATION
// =========================

function normalizeEmail(email) {
    return String(email).trim().toLowerCase();
}

// =========================
// EVENT EMITTER (LOGICAL CONTRACT)
// =========================

function emitAuthEvent(type, payload) {
    return {
        eventType: type,
        tenant: "civic-nigeria",
        timestamp: Date.now(),
        payload
    };
}

// =========================
// REGISTER USER
// =========================

export async function registerUser(email, password) {
    const safeEmail = normalizeEmail(email);

    const result = await createUserWithEmailAndPassword(
        auth,
        safeEmail,
        password
    );

    return emitAuthEvent("USER_REGISTERED", {
        uid: result.user.uid,
        email: safeEmail
    });
}

// =========================
// LOGIN USER
// =========================

export async function loginUser(email, password) {
    const safeEmail = normalizeEmail(email);

    const result = await signInWithEmailAndPassword(
        auth,
        safeEmail,
        password
    );

    return emitAuthEvent("USER_LOGIN", {
        uid: result.user.uid,
        email: safeEmail
    });
}

// =========================
// LOGOUT USER
// =========================

export async function logoutUser() {
    await signOut(auth);

    return emitAuthEvent("USER_LOGOUT", {
        status: "SUCCESS"
    });
}