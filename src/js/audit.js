
/**
 * CIVICREPORT NIGERIA — STAGE 6 (AUDIT LAYER)
 * -------------------------------------------
 * ROLE:
 * - Capture client-side audit signals (untrusted)
 * - Forward structured events to backend ledger
 * - Never determine truth, only record intent
 *
 * PRINCIPLE:
 * Client audit = telemetry
 * Server audit = truth ledger
 */

// ======================================================
// 1. IMMUTABLE EVENT TYPES (CONTRACT)
// ======================================================

const AUDIT_EVENTS = Object.freeze({
    ADMIN_LOGIN_ATTEMPT: "ADMIN_LOGIN_ATTEMPT",
    ADMIN_LOGIN_SUCCESS: "ADMIN_LOGIN_SUCCESS",
    ADMIN_LOGIN_FAILURE: "ADMIN_LOGIN_FAILURE",
    REPORT_RESOLVE_ATTEMPT: "REPORT_RESOLVE_ATTEMPT",
    REPORT_RESOLVE_SUCCESS: "REPORT_RESOLVE_SUCCESS",
    REPORT_RESOLVE_FAILURE: "REPORT_RESOLVE_FAILURE"
});

// ======================================================
// 2. TIME KERNEL (DEPENDENT ON DASHBOARD SYNC)
// ======================================================

function getLogicalTime() {
    return Date.now(); // must NOT be used for truth, only telemetry
}

// ======================================================
// 3. HTTP PORT (INFRASTRUCTURE ADAPTER)
// ======================================================

async function sendAuditEvent(event) {
    const res = await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(event)
    });

    if (!res.ok) {
        // audit must never block system flow
        return false;
    }

    return true;
}

// ======================================================
// 4. EVENT FACTORY (DETERMINISTIC STRUCTURE)
// ======================================================

function createAuditEvent(type, payload = {}) {
    return Object.freeze({
        type,
        payload,
        timestamp: getLogicalTime(),
        client: {
            userAgent: navigator.userAgent
        }
    });
}

// ======================================================
// 5. SAFE DISPATCHER (NON-BLOCKING)
// ======================================================

async function dispatchAudit(type, payload = {}) {
    const event = createAuditEvent(type, payload);

    try {
        // fire-and-forget telemetry (DO NOT BLOCK UX)
        await sendAuditEvent(event);
    } catch {
        // NEVER interrupt system flow
        // audit loss is acceptable; system integrity is not
    }
}

// ======================================================
// 6. HIGH-LEVEL AUDIT API (APPLICATION PORTS)
// ======================================================

export const Audit = Object.freeze({
    loginAttempt: (email) =>
        dispatchAudit(AUDIT_EVENTS.ADMIN_LOGIN_ATTEMPT, {
            email
        }),

    loginSuccess: (sessionId) =>
        dispatchAudit(AUDIT_EVENTS.ADMIN_LOGIN_SUCCESS, {
            sessionId
        }),

    loginFailure: (reason) =>
        dispatchAudit(AUDIT_EVENTS.ADMIN_LOGIN_FAILURE, {
            reason
        }),

    resolveAttempt: (reportId) =>
        dispatchAudit(AUDIT_EVENTS.REPORT_RESOLVE_ATTEMPT, {
            reportId
        }),

    resolveSuccess: (reportId) =>
        dispatchAudit(AUDIT_EVENTS.REPORT_RESOLVE_SUCCESS, {
            reportId
        }),

    resolveFailure: (reportId, reason) =>
        dispatchAudit(AUDIT_EVENTS.REPORT_RESOLVE_FAILURE, {
            reportId,
            // reason
        })
});