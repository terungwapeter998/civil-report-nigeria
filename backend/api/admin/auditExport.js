/**
 * CIVICREPORT NIGERIA — STAGE 6 (HARDENED + DETERMINISTIC LEDGER EXPORT)
 * backend/api/admin/auditexport.js
 *
 * GOAL:
 * - Cryptographically deterministic audit export
 * - Stable canonical serialization (fixes JSON ordering failure)
 * - Append-only ledger snapshot with hash chaining
 * - Read-only verification layer
 */

import crypto from "crypto";
import { getAuditLedger } from "../../services/auditLedger.js";

// ======================================================
// 1. CANONICAL SERIALIZATION (DETERMINISTIC CONTRACT)
// ======================================================

function canonicalize(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(canonicalize).join(",")}]`;
    }

    const keys = Object.keys(value).sort();

    let result = "{";

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        result += `"${key}":${canonicalize(value[key])}`;
        if (i !== keys.length - 1) result += ",";
    }

    result += "}";
    return result;
}

// ======================================================
// 2. CRYPTOGRAPHIC HASHING (CHAIN INTEGRITY)
// ======================================================

function hashEvent(event, previousHash = "") {
    const stableEvent = canonicalize(event);

    return crypto
        .createHash("sha256")
        .update(stableEvent + previousHash)
        .digest("hex");
}

// ======================================================
// 3. LEDGER SNAPSHOT BUILDER (IMMUTABLE PROJECTION)
// ======================================================

function buildAuditSnapshot(events) {
    let chain = [];
    let previousHash = "";

    for (let i = 0; i < events.length; i++) {
        const event = events[i];

        const hash = hashEvent(event, previousHash);

        const node = Object.freeze({
            ...event,
            hash,
            previousHash
        });

        chain.push(node);
        previousHash = hash;
    }

    return Object.freeze({
        totalEvents: chain.length,
        headHash: previousHash,
        chain: Object.freeze(chain)
    });
}

// ======================================================
// 4. EXPORT CONTROLLER (READ-ONLY LEDGER INTERFACE)
// ======================================================

export async function exportAuditLedger(req, res) {
    try {
        const { from, to } = req.query;

        // ==================================================
        // SOURCE OF TRUTH (BACKEND LEDGER ONLY)
        // ==================================================

        const events = await getAuditLedger({ from, to });

        if (!Array.isArray(events)) {
            return res.status(500).json({
                error: "LEDGER_CORRUPTION"
            });
        }

        // ==================================================
        // DETACHED SNAPSHOT GENERATION
        // ==================================================

        const snapshot = buildAuditSnapshot(events);

        // ==================================================
        // VERIFIABLE RESPONSE CONTRACT
        // ==================================================

        return res.status(200).json({
            exportedAt: new Date().toISOString(),
            range: {
                from: from || null,
                to: to || null
            },
            integrity: {
                algorithm: "SHA-256",
                canonicalization: "stable-key-sorted-json",
                headHash: snapshot.headHash
            },
            ledger: snapshot
        });

    } catch (err) {
        return res.status(500).json({
            error: "EXPORT_FAILURE"
        });
    }
}