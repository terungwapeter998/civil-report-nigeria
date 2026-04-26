/**
 * CIVICREPORT NIGERIA — STAGE 6 (MISSION CRITICAL HARDENED)
 * CORE REPORT INGRESS ENGINE
 * ----------------------------------------------
 * INVARIANTS:
 * 1. DOMAIN CONSISTENCY: State + Ledger MUST succeed or both rollback
 * 2. IDENTITY: Derived ONLY from verified auth signature
 * 3. DETERMINISM: ULID + server time anchoring
 * 4. INTEGRITY: Ledger entries are cryptographically sealed
 */

// ======================================================
// DEPENDENCIES
// ======================================================

const { ulid } = require("ulid");
const crypto = require("crypto");
const { db } = require("../../infrastructure/PersistenceManager");

// ======================================================
// 1. DOMAIN VALIDATION (PURE)
// ======================================================

function validateInvariants(data) {
    if (!data?.title || data.title.trim().length < 5) {
        throw new Error("INVARIANT_TITLE_TOO_SHORT");
    }

    if (!data?.description || data.description.trim().length < 20) {
        throw new Error("INVARIANT_DESC_TOO_SHORT");
    }
}

// ======================================================
// 2. CRYPTOGRAPHIC LEDGER SIGNING (NEW)
// ======================================================

function signLedgerEvent(event) {
    const secret = process.env.LEDGER_SECRET;

    const payload = JSON.stringify(event);
    const signature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

    return {
        ...event,
        signature
    };
}

// ======================================================
// 3. ATOMIC DOMAIN SERVICE
// ======================================================

async function createReportService(authContext, input, idempotencyKey) {
    const reportId = ulid();

    return await db.transaction(async (tx) => {

        // 1. Idempotency Guard
        if (idempotencyKey) {
            const existing = await tx.idempotency.findUnique({
                where: { key: idempotencyKey }
            });

            if (existing) return { ...existing.responseData, isReplay: true };
        }

        // 2. DOMAIN ENTITY
        const report = Object.freeze({
            id: reportId,
            userId: authContext.userId, // MUST be verified upstream
            title: input.title.trim(),
            description: input.description.trim(),
            status: "PENDING",
            createdAt: new Date().toISOString()
        });

        // 3. LEDGER EVENT (IMMUTABLE)
        const rawEvent = {
            eventType: "REPORT_CREATED",
            entityId: reportId,
            actorId: authContext.userId,
            payload: {
                title: report.title
            },
            timestamp: Date.now()
        };

        const signedEvent = signLedgerEvent(rawEvent);

        // 4. COMMIT STATE
        await tx.reports.create({ data: report });

        // 5. COMMIT LEDGER
        await tx.ledger.create({ data: signedEvent });

        // 6. IDEMPOTENCY STORE
        if (idempotencyKey) {
            await tx.idempotency.create({
                data: {
                    key: idempotencyKey,
                    responseData: report
                }
            });
        }

        return report;
    });
}

// ======================================================
// 4. CONTROLLER (HTTP BOUNDARY)
// ======================================================

export async function createReport(req, res) {
    try {

        // STRICT AUTH CONTRACT
        const authContext = req.auth; // injected by verified middleware

        if (!authContext?.userId || !authContext?.signatureValid) {
            return res.status(401).json({ error: "UNAUTHORIZED" });
        }

        const idempotencyKey = req.headers["x-idempotency-key"];

        validateInvariants(req.body);

        const result = await createReportService(
            authContext,
            req.body,
            idempotencyKey
        );

        return res.status(result.isReplay ? 200 : 201).json({
            success: true,
            data: result,
            meta: {
                system: "CIVICREPORT_NIGERIA",
                serverTime: Date.now()
            }
        });

    } catch (err) {

        const code = err.message;

        const status =
            code.startsWith("INVARIANT_") ? 400 :
                code === "UNAUTHORIZED" ? 401 :
                    500;

        return res.status(status).json({
            success: false,
            error: code
        });
    }
}