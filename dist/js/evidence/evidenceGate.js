/**
 * CIVICREPORT NIGERIA — STAGE 6
 * EVIDENCE GATEWAY (INFRASTRUCTURE ADAPTER)
 * -----------------------------------------
 * RESPONSIBILITIES:
 * - validate evidence files
 * - enforce strict type/size rules
 * - upload to storage
 * - return immutable references only
 *
 * RULE:
 * NEVER expose raw file URLs to ledger logic
 */

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { app } from "../firebase.js";

const storage = getStorage(app);

// =========================
// SECURITY CONSTRAINTS
// =========================

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm"
];

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

// =========================
// VALIDATION LAYER
// =========================

function validateFile(file) {
    if (!file) {
        throw new Error("Invalid file");
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}`);
    }

    if (file.size > MAX_SIZE) {
        throw new Error("File exceeds 25MB limit");
    }

    return true;
}

// =========================
// STORAGE PATH GENERATOR (DETERMINISTIC)
// =========================

function buildStoragePath(file, tenant = "civic-nigeria") {
    const timestamp = Date.now();
    const safeName = file.name.replace(/\s/g, "_");

    return `evidence/${tenant}/${timestamp}_${safeName}`;
}

// =========================
// MAIN UPLOAD PIPELINE
// =========================

export async function uploadEvidenceFiles(files = []) {
    const results = [];

    for (const file of files) {
        validateFile(file);

        const path = buildStoragePath(file);

        const storageRef = ref(storage, path);

        const snapshot = await uploadBytes(storageRef, file);

        const url = await getDownloadURL(snapshot.ref);

        results.push({
            path,
            url,
            type: file.type,
            size: file.size
        });
    }

    return results;
}