
/**
 * CIVICREPORT NIGERIA — STAGE 6 (BACKEND AUTHORITY LAYER)
 * --------------------------------------------------------
 * ROLE:
 * - Validate credentials
 * - Enforce role-based access
 * - Issue signed session
 * - Emit audit events (TRUTH LAYER)
 *
 * PRINCIPLE:
 * Backend = sole authority
 * Frontend = untrusted client
 */

// ======================================================
// 1. DEPENDENCIES (INFRASTRUCTURE)
// ======================================================

const crypto = require("crypto");

// (placeholder abstractions — assume injected in real system)
const UserRepo = require("../../domain/UserRepo");
const AuditLedger = require("../../ledger/AuditLedger");
const SessionStore = require("../../security/SessionStore");

// ======================================================
// 2. CONSTANTS (SYSTEM INVARIANTS)
// ======================================================

const ROLES = Object.freeze({
    ADMIN: "admin"
});

const ERRORS = Object.freeze({
    INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
    UNAUTHORIZED: "UNAUTHORIZED",
    SYSTEM_FAILURE: "SYSTEM_FAILURE"
});

// ======================================================
// 3. TIME AUTHORITY (SERVER TRUTH)
// ======================================================

function now() {
    return Date.now();
}

// ======================================================
// 4. SESSION FACTORY (DETERMINISTIC + SIGNED)
// ======================================================

function createSession(user) {
    const sessionId = crypto.randomUUID();

    const expiresAt = now() + 1000 * 60 * 60 * 2; // 2 hours

    const payload = {
        sessionId,
        userId: user.id,
        role: user.role,
        createdAt: now(),
        expiresAt
    };

    // cryptographic integrity binding
    const signature = crypto
        .createHmac("sha256", process.env.SESSION_SECRET)
        .update(JSON.stringify(payload))
        .digest("hex");

    return {
        ...payload,
        signature
    };
}

// ======================================================
// 5. AUDIT EMITTER (SOURCE OF TRUTH)
// ======================================================

async function emitAudit(type, data) {
    await AuditLedger.append({
        type,
        data,
        timestamp: now()
    });
}

// ======================================================
// 6. CONTROLLER (AUTH ORCHESTRATION)
// ======================================================

async function loginController(req, res) {
    try {
        const { email, password } = req.body;

        // ==================================================
        // 1. INPUT VALIDATION (FAIL FAST)
        // ==================================================

        if (!email || !password) {
            await emitAudit("LOGIN_FAILURE", { reason: "MISSING_FIELDS", email });

            return res.status(400).json({
                error: ERRORS.INVALID_CREDENTIALS
            });
        }

        // ==================================================
        // 2. USER LOOKUP
        // ==================================================

        const user = await UserRepo.findByEmail(email.toLowerCase());

        if (!user) {
            await emitAudit("LOGIN_FAILURE", { reason: "USER_NOT_FOUND", email });

            return res.status(401).json({
                error: ERRORS.INVALID_CREDENTIALS
            });
        }

        // ==================================================
        // 3. PASSWORD VERIFICATION
        // ==================================================

        const isValid = await UserRepo.verifyPassword(user, password);

        if (!isValid) {
            await emitAudit("LOGIN_FAILURE", { reason: "BAD_PASSWORD", userId: user.id });

            return res.status(401).json({
                error: ERRORS.INVALID_CREDENTIALS
            });
        }

        // ==================================================
        // 4. ROLE ENFORCEMENT (SYSTEM INVARIANT)
        // ==================================================

        if (user.role !== ROLES.ADMIN) {
            await emitAudit("LOGIN_FAILURE", { reason: "UNAUTHORIZED_ROLE", userId: user.id });

            return res.status(403).json({
                error: ERRORS.UNAUTHORIZED
            });
        }

        // ==================================================
        // 5. SESSION ISSUANCE
        // ==================================================

        const session = createSession(user);

        await SessionStore.save(session.sessionId, session);

        // ==================================================
        // 6. SUCCESS AUDIT (TRUTH LAYER)
        // ==================================================

        await emitAudit("LOGIN_SUCCESS", {
            userId: user.id,
            sessionId: session.sessionId
        });

        // ==================================================
        // 7. RESPONSE CONTRACT (DETERMINISTIC OUTPUT)
        // ==================================================

        return res.status(200).json({
            sessionId: session.sessionId,
            role: user.role,
            expiresAt: session.expiresAt,
            serverTime: now()
        });

    } catch (err) {
        await emitAudit("LOGIN_SYSTEM_FAILURE", {
            error: err.message
        });

        return res.status(500).json({
            error: ERRORS.SYSTEM_FAILURE
        });
    }
}

module.exports = loginController;