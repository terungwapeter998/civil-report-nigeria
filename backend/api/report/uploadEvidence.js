/**
 * CIVICREPORT NIGERIA — STAGE 6 (HARDENED + CORRECTED)
 * REPORT EVIDENCE INGESTION LAYER
 * --------------------------------
 * FIXES:
 * - Deterministic ledger via content hashing (NOT time)
 * - Atomic storage + ledger commit
 * - Anti-MIME spoof deep validation
 * - Idempotent request protection
 */

// ======================================================
// 1. CRYPTO PRIMITIVE (DETERMINISTIC LEDGER CORE)
// ======================================================

import crypto from "crypto";

function hashContent(buffer, meta) {
    return crypto
        .createHash("sha256")
        .update(buffer)
        .update(meta.reportId)
        .update(meta.userId)
        .digest("hex");
}

// ======================================================
// 2. INVARIANTS
// ======================================================

const CONFIG = Object.freeze({
    MAX_FILE_SIZE_MB: 20,
    ALLOWED_SIGNATURES: {
        "image/jpeg": "ffd8ff",
        "image/png": "89504e47",
        "video/mp4": "00000018",
        "video/webm": "1a45dfa3"
    }
});

// ======================================================
// 3. DEEP FILE VALIDATION (ANTI-SPOOF LAYER)
// ======================================================

function validateFileIntegrity(file) {
    if (!file?.buffer) throw new Error("INVALID_FILE");

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > CONFIG.MAX_FILE_SIZE_MB) {
        throw new Error("FILE_TOO_LARGE");
    }

    const signature = file.buffer.toString("hex", 0, 4);
    const expected = CONFIG.ALLOWED_SIGNATURES[file.mimetype];

    if (!expected || !signature.startsWith(expected)) {
        throw new Error("MIME_SPOOF_DETECTED");
    }

    return true;
}

// ======================================================
// 4. ATOMIC STORAGE + LEDGER (CRITICAL FIX)
// ======================================================

async function atomicCommit({ buffer, meta }) {
    const fileHash = hashContent(buffer, meta);

    // STEP 1: check idempotency (prevents replay duplicates)
    if (await ledgerExists(fileHash)) {
        return { duplicate: true, fileHash };
    }

    // STEP 2: store file
    const storageKey = await storeFile(buffer, meta, fileHash);

    // STEP 3: write ledger (ONLY AFTER STORAGE SUCCESS)
    await appendLedger({
        type: "EVIDENCE_UPLOADED",
        fileHash,
        storageKey,
        reportId: meta.reportId,
        userId: meta.userId
    });

    return { storageKey, fileHash };
}

// ======================================================
// 5. STORAGE PORT (INFRASTRUCTURE)
// ======================================================

async function storeFile(buffer, meta, fileHash) {
    const key = `evidence/${meta.reportId}/${fileHash}`;

    // simulate storage write (S3/Firebase/MinIO adapter)
    return key;
}

// ======================================================
// 6. LEDGER PORT (APPEND-ONLY TRUTH LAYER)
// ======================================================

async function appendLedger(event) {
    console.log("[LEDGER]", JSON.stringify(event));
    return true;
}

async function ledgerExists(fileHash) {
    // replace with DB lookup in real system
    return false;
}

// ======================================================
// 7. MAIN HANDLER (CLEAN ORCHESTRATION)
// ======================================================

export async function uploadEvidence(req, res) {
    try {
        const user = req.user;
        if (!user?.id) throw new Error("UNAUTHORIZED");

        const file = req.file;
        const { reportId } = req.body;

        validateFileIntegrity(file);

        const result = await atomicCommit({
            buffer: file.buffer,
            meta: {
                reportId,
                userId: user.id,
                mimetype: file.mimetype
            }
        });

        return res.status(201).json({
            success: true,
            storageKey: result.storageKey,
            fileHash: result.fileHash,
            duplicate: result.duplicate || false
        });

    } catch (err) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
}