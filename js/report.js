import { uploadEvidenceFiles } from "./evidence/evidenceGateway.js";
import { createLedgerEvent } from "./ledger/ledgerService.js";

/**
 * CIVICREPORT NIGERIA — STAGE 6
 * REPORT ORCHESTRATION LAYER
 * --------------------------------
 * RESPONSIBILITIES:
 * - validate user intent
 * - delegate file upload
 * - build deterministic event
 * - send to backend API only
 */

// =========================
// DOM BINDING
// =========================

const form = document.getElementById("reportForm");
const msg = document.getElementById("msg");

// =========================
// INPUT SANITIZATION
// =========================

function normalizeText(value) {
    return String(value || "").trim();
}

// =========================
// BASIC VALIDATION (UI LAYER ONLY)
// =========================

function validateReportInput(data) {
    if (!data.title || data.title.length < 5) {
        throw new Error("Title too short");
    }

    if (!data.description || data.description.length < 20) {
        throw new Error("Description too short");
    }

    if (!data.location) {
        throw new Error("Location required");
    }

    return true;
}

// =========================
// MAIN HANDLER
// =========================

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            msg.textContent = "Processing report...";

            // -------------------------
            // STEP 1: COLLECT INPUT
            // -------------------------
            const data = {
                title: normalizeText(document.getElementById("title").value),
                category: document.getElementById("category").value,
                description: normalizeText(document.getElementById("description").value),
                location: normalizeText(document.getElementById("location").value)
            };

            validateReportInput(data);

            // -------------------------
            // STEP 2: HANDLE EVIDENCE
            // -------------------------
            const fileInput = document.getElementById("evidenceFiles");
            const files = fileInput?.files ? Array.from(fileInput.files) : [];

            const evidenceRefs = await uploadEvidenceFiles(files);

            // -------------------------
            // STEP 3: BUILD LEDGER EVENT
            // -------------------------
            const event = createLedgerEvent("CIVIC_REPORT_CREATED", {
                tenant: "civic-nigeria",
                payload: {
                    ...data,
                    evidence: evidenceRefs
                }
            });

            // -------------------------
            // STEP 4: SEND TO BACKEND
            // -------------------------
            const response = await fetch("/api/report/createReport", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(event)
            });

            if (!response.ok) {
                throw new Error("Failed to submit report");
            }

            const result = await response.json();

            msg.textContent = "Report submitted successfully.";
            form.reset();

            console.log("Ledger Event:", result);

        } catch (err) {
            msg.textContent = err.message;
            console.error(err);
        }
    });
}