
async function resolveReport(reportId, adminContext) {
    const ref = db.collection("reports").doc(reportId);
    const outboxRef = db.collection("outbox").doc();

    return await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref);

        if (!snap.exists) {
            throw new Error("REPORT_NOT_FOUND");
        }

        const report = snap.data();

        const alreadyResolved = report.status === REPORT_STATUS.RESOLVED;

        // --------------------------------------------------
        // IDEMPOTENCY HANDLING (WITH AUDIT TRACE)
        // --------------------------------------------------
        if (alreadyResolved) {
            transaction.set(outboxRef, {
                type: "REPORT_RESOLVE_REPLAYED",
                reportId,
                actor: adminContext.userId,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, idempotent: true };
        }

        // --------------------------------------------------
        // ATOMIC STATE TRANSITION
        // --------------------------------------------------
        transaction.update(ref, {
            status: REPORT_STATUS.RESOLVED,
            resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
            resolvedBy: adminContext.userId,
            version: admin.firestore.FieldValue.increment(1)
        });

        // --------------------------------------------------
        // OUTBOX EVENT (DECOUPLED LEDGER WRITE)
        // --------------------------------------------------
        transaction.set(outboxRef, {
            type: "REPORT_RESOLVED",
            reportId,
            actor: adminContext.userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            snapshot: {
                previousStatus: report.status,
                newStatus: REPORT_STATUS.RESOLVED
            }
        });

        return { success: true, idempotent: false };
    });
}