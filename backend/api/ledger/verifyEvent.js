import stableStringify from "json-stable-stringify";
import crypto from "crypto";

// ======================================================
// 1. CONFIGURATION (DETERMINISTIC CONSTANTS)
// ======================================================

const EXPIRY_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 10000;

// ======================================================
// 2. REPLAY STORE (IN-MEMORY LEDGER GUARD)
// ======================================================

const replayCache = new Map();

// ======================================================
// 3. CANONICAL HASH WITH CONTEXT BINDING
// ======================================================

function hashEvent(event) {
    const canonical = stableStringify({
        type: event.type,
        payload: event.payload,
        timestamp: event.timestamp,
        client: event.client,

        // CRITICAL FIX: bind identity context
        actorId: event.actorId || "UNKNOWN",
        tenantId: event.tenantId || "GLOBAL"
    });

    return crypto.createHash("sha256").update(canonical).digest("hex");
}

// ======================================================
// 4. ATOMIC REPLAY CHECK (FIXED LOGIC)
// ======================================================

function isReplay(hash) {
    return replayCache.has(hash);
}

function register(hash) {
    replayCache.set(hash, Date.now());
}

// ======================================================
// 5. TIME-BASED CLEANUP (DETERMINISTIC WINDOWING)
// ======================================================

function cleanupCache(now) {
    for (const [hash, ts] of replayCache.entries()) {
        if (now - ts > EXPIRY_WINDOW) {
            replayCache.delete(hash);
        }
    }
}

// ======================================================
// 6. MAIN VERIFICATION PIPELINE
// ======================================================

export function verifyLedgerEvent(event) {
    const now = Date.now();

    // 1. BASIC SANITY
    if (!event || typeof event !== "object") {
        return { valid: false, reason: "INVALID_EVENT" };
    }

    // 2. TIMESTAMP VALIDATION (DRIFT WINDOW)
    if (Math.abs(now - event.timestamp) > EXPIRY_WINDOW) {
        return { valid: false, reason: "TIMESTAMP_DRIFT" };
    }

    // 3. GENERATE DETERMINISTIC HASH
    const eventHash = hashEvent(event);

    // 4. REPLAY CHECK (READ FIRST)
    if (isReplay(eventHash)) {
        return { valid: false, reason: "REPLAY_DETECTED" };
    }

    // 5. REGISTER FIRST (REDUCES RACE WINDOW)
    register(eventHash);

    // 6. DETERMINISTIC CLEANUP
    if (replayCache.size > MAX_CACHE_SIZE) {
        cleanupCache(now);
    }

    return {
        valid: true,
        hash: eventHash
    };
}