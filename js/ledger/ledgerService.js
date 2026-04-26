/**
 * CIVICREPORT NIGERIA — STAGE 6
 * LEDGER SERVICE (CORE DOMAIN CONSTRUCTOR)
 * ----------------------------------------
 * RESPONSIBILITIES:
 * - construct deterministic civic events
 * - ensure immutable structure
 * - bind tenant context
 * - produce replayable event objects
 *
 * RULE:
 * This file MUST NOT perform persistence.
 */

import crypto from "crypto-js";

// =========================
// CORE CONSTANTS
// =========================

const TENANT = "civic-nigeria";

// =========================
// DETRMINISTIC HASH ENGINE
// =========================

function generateHash(event) {
    const raw = JSON.stringify(event, Object.keys(event).sort());
    return crypto.SHA256(raw).toString();
}

// =========================
// TIME SOURCE (deterministic boundary)
// =========================

function getTimestamp() {
    return Date.now();
}

// =========================
// LEDGER EVENT FACTORY
// =========================

export function createLedgerEvent(eventType, data = {}) {
    const baseEvent = {
        eventType,
        tenant: TENANT,
        timestamp: getTimestamp(),
        payload: data.payload || {},
        meta: {
            source: "civic-ui",
            version: "1.0.0"
        }
    };

    const hash = generateHash(baseEvent);

    return {
        ...baseEvent,
        eventHash: hash
    };
}

// =========================
// EVENT VALIDATION (STRICT RULES)
// =========================

export function validateLedgerEvent(event) {
    if (!event.eventType) {
        throw new Error("Missing event type");
    }

    if (event.tenant !== TENANT) {
        throw new Error("Tenant violation detected");
    }

    if (!event.eventHash) {
        throw new Error("Missing event hash");
    }

    return true;
}