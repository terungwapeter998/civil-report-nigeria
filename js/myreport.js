/**
 * CIVICREPORT NIGERIA — STAGE 6
 * MY REPORTS PROJECTION LAYER
 * --------------------------------
 * RULES:
 * - READ ONLY
 * - NO BUSINESS LOGIC
 * - NO STATE MUTATION
 */

import { db } from "./firebase.js";
import {
    collection,
    query,
    where,
    getDocs,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =========================
// DOM BINDING
// =========================

const listContainer = document.getElementById("reportList");
const loadingState = document.getElementById("loadingState");

// =========================
// RENDER HELPERS
// =========================

function renderReport(doc) {
    const data = doc.data();

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
    <h3>${data.title}</h3>
    <p><strong>Category:</strong> ${data.category}</p>
    <p><strong>Location:</strong> ${data.location}</p>
    <p>${data.description}</p>
    <small>Status: ${data.status || "PENDING"}</small>
  `;

    return div;
}

// =========================
// FETCH LEDGER PROJECTION
// =========================

async function loadMyReports(userId) {
    try {
        const q = query(
            collection(db, "reports"),
            where("userId", "==", userId),
            orderBy("timestamp", "desc")
        );

        const snapshot = await getDocs(q);

        loadingState.style.display = "none";

        if (snapshot.empty) {
            listContainer.innerHTML = "<p>No reports found.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            listContainer.appendChild(renderReport(doc));
        });

    } catch (err) {
        console.error("Ledger fetch error:", err);
        loadingState.innerHTML = "Failed to load reports.";
    }
}

// =========================
// BOOTSTRAP
// =========================

(function init() {
    // In real Stage 6 system:
    // userId MUST come from verified auth session token
    const fakeUserId = "CURRENT_USER_ID_PLACEHOLDER";

    loadMyReports(fakeUserId);
})();