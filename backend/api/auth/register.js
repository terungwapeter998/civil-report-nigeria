
/**
 * CIVICREPORT NIGERIA — STAGE 6
 * AUTH REGISTRATION SERVICE
 * -------------------------------------
 * ROLE:
 * - Create user identity safely
 * - Enforce uniqueness + invariants
 * - Emit immutable audit events
 * - Maintain deterministic system state
 *
 * PRINCIPLE:
 * Backend is the ONLY trust boundary
 */

// ======================================================
// 1. DOMAIN INVARIANTS (IMMUTABLE RULES)
// ======================================================

const INVARIANTS = Object.freeze({
    MIN_PASSWORD_LENGTH: 6,
    MAX_EMAIL_LENGTH: 254
});

// ======================================================
// 2. SAFE INPUT NORMALIZATION
// ======================================================

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
    return (
        typeof email === "string" &&
        email.length > 0 &&
        email.length <= INVARIANTS.MAX_EMAIL_LENGTH &&
        email.includes("@")
    );
}

function isValidPassword(password) {
    return (
        typeof password === "string" &&
        password.length >= INVARIANTS.MIN_PASSWORD_LENGTH
    );
}

// ======================================================
// 3. DEPENDENCY PORTS (HEXAGONAL ARCHITECTURE)
// ======================================================

async function findUserByEmail(db, email) {
    return await db.collection("users").where("email", "==", email).get();
}

async function createUser(db, user) {
    return await db.collection("users").add(user);
}

async function writeLedgerEvent(ledger, event) {
    return await ledger.append(event);
}

// ======================================================
// 4. LEDGER EVENT FACTORY (IMMUTABLE)
// ======================================================

function createLedgerEvent(type, payload = {}) {
    return Object.freeze({
        type,
        payload,
        timestamp: Date.now(), // server-authoritative only
    });
}

// ======================================================
// 5. CORE REGISTRATION ORCHESTRATOR
// ======================================================

export async function registerUser({ db, ledger, crypto }, req, res) {
    try {
        const { email, password, name } = req.body || {};

        // -------------------------
        // INPUT VALIDATION (STRICT)
        // -------------------------

        const cleanEmail = normalizeEmail(email);

        if (!isValidEmail(cleanEmail) || !isValidPassword(password)) {
            await writeLedgerEvent(
                ledger,
                createLedgerEvent("REGISTER_FAILURE", {
                    reason: "INVALID_INPUT",
                    email: cleanEmail
                })
            );

            return res.status(400).json({
                success: false,
                error: "Invalid registration input"
            });
        }

        // -------------------------
        // UNIQUENESS CHECK
        // -------------------------

        const existing = await findUserByEmail(db, cleanEmail);

        if (!existing.empty) {
            await writeLedgerEvent(
                ledger,
                createLedgerEvent("REGISTER_FAILURE", {
                    reason: "USER_EXISTS",
                    email: cleanEmail
                })
            );

            return res.status(409).json({
                success: false,
                error: "User already exists"
            });
        }

        // -------------------------
        // PASSWORD HASHING (SECURE)
        // -------------------------

        const hashedPassword = await crypto.hash(password);

        // -------------------------
        // USER CREATION (ATOMIC INTENT)
        // -------------------------

        const user = {
            email: cleanEmail,
            name: String(name || "").trim(),
            password: hashedPassword,
            role: "citizen",
            createdAt: Date.now()
        };

        const createdRef = await createUser(db, user);

        // -------------------------
        // SUCCESS LEDGER EVENT
        // -------------------------

        await writeLedgerEvent(
            ledger,
            createLedgerEvent("REGISTER_SUCCESS", {
                userId: createdRef.id,
                email: cleanEmail
            })
        );

        // -------------------------
        // RESPONSE (NO SENSITIVE DATA)
        // -------------------------

        return res.status(201).json({
            success: true,
            userId: createdRef.id
        });

    } catch (err) {
        // -------------------------
        // SYSTEM FAILURE LEDGER EVENT
        // -------------------------

        await writeLedgerEvent(
            ledger,
            createLedgerEvent("REGISTER_FAILURE", {
                reason: "SYSTEM_ERROR"
            })
        );

        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
}