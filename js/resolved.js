/**
 * CIVICREPORT NIGERIA — STAGE 6
 * RESOLVED REPORTS PROJECTION LAYER
 * --------------------------------
 * ROLE:
 * - READ ONLY ledger projection
 * - state-filtered rendering
 * - NO business logic
 */

import { db } from "./firebase.js";
import {
    collection,
    query,
    where,
    orderBy,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =========================
// DOM BINDING
// =========================

const container = document.getElementById("resolvedList");
const loading = document.getElementById("loadingState");

// =========================
// RENDER FUNCTION
// =========================

function renderResolvedItem(doc) {
    const data = doc.data();

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
    <h3>${data.title}</h3>
    <p><strong>Category:</strong> ${data.category}</p>
    <p><strong>Location:</strong> ${data.location}</p>
    <p>${data.description}</p>

    <small>
      Status: RESOLVED
    </small>
  `;

    return card;
}

// =========================
// LOAD RESOLVED LEDGER PROJECTION
// =========================

async function loadResolvedReports() {
    try {
        const q = query(
            collection(db, "reports"),
            where("status", "==", "RESOLVED"),
            orderBy("timestamp", "desc")
        );

        const snapshot = await getDocs(q);

        loading.style.display = "none";

        if (snapshot.empty) {
            container.innerHTML = "<p>No resolved reports found.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            container.appendChild(renderResolvedItem(doc));
        });

    } catch (err) {
        console.error("Resolved ledger fetch error:", err);
        loading.innerHTML = "Failed to load resolved reports.";
    }
}

// =========================
// BOOTSTRAP
// =========================

(function init() {
    loadResolvedReports();
})();