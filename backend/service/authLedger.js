/**
 * STAGE 6 AUDIT LEDGER: ATOMIC CHAIN PROTOCOL
 * * SYSTEM INVARIANTS:
 * I1: SHA-256 Chaining with Recursive Canonicalization
 * I2: Zero-Global State (Stateless Service, Database-backed integrity)
 * I3: Concurrency Protection (Atomic Transactions)
 * I4: No Infrastructure Leakage (Pure Dependency Injection)
 */

const serialize = (value) => {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    const sorted = Object.keys(value).sort().reduce((acc, key) => {
        acc[key] = serialize(value[key]);
        return acc;
    }, {});
    return JSON.stringify(sorted);
};

/**
 * LEDGER FACTORY
 * @param {Object} dbPort - The Hexagonal Storage Port
 * @param {Function} hasher - The Cryptographic Port
 */
export const createAuditLedger = (dbPort, hasher) => {

    /**
     * ATOMIC APPEND
     * Uses a database transaction to ensure the chain never "forks"
     */
    const append = async (tenantContext, event, clock) => {
        if (!clock?.seq || !clock?.ts) {
            throw new Error("DETERMINISM_VIOLATION: Logical clock required");
        }

        // SYSTEM INVARIANT: Tenant path must be derived from validated context
        const ledgerRef = dbPort.getCollectionPath(tenantContext, "auditLedger");

        return await dbPort.runTransaction(async (transaction) => {
            // 1. FETCH HEAD: Get the previous entry to verify the link
            // This prevents the 'lastHash' reset bug in serverless/distributed envs
            const lastEntryQuery = await dbPort.getLastEntry(transaction, ledgerRef);
            const prevHash = lastEntryQuery ? lastEntryQuery.hash : "GENESIS";
            const expectedSeq = lastEntryQuery ? lastEntryQuery.seq + 1 : 1;

            // 2. LOGICAL DETERMINISM: Ensure sequence integrity
            if (clock.seq !== expectedSeq) {
                throw new Error(`SEQUENCE_VIOLATION: Expected ${expectedSeq}, got ${clock.seq}`);
            }

            // 3. CANONICALIZATION
            const normalizedEvent = {
                tenantId: tenantContext.id,
                type: event.type,
                payload: event.payload,
                actor: event.actor,
                seq: clock.seq,
                prevHash: prevHash
            };

            const currentHash = hasher(serialize(normalizedEvent));

            const ledgerEntry = Object.freeze({
                ...normalizedEvent,
                hash: currentHash,
                occurredAt: clock.ts // Metadata only
            });

            // 4. ATOMIC COMMIT
            await dbPort.insert(transaction, ledgerRef, currentHash, ledgerEntry);

            return ledgerEntry;
        });
    };

    /**
     * VERIFY CHAIN: Mathematical proof of non-tampering
     */
    const verifyChain = (events) => {
        return events.every((e, i) => {
            const prev = i === 0 ? "GENESIS" : events[i - 1].hash;

            const recomputed = hasher(serialize({
                tenantId: e.tenantId,
                type: e.type,
                payload: e.payload,
                actor: e.actor,
                seq: e.seq,
                prevHash: prev
            }));

            if (recomputed !== e.hash) {
                throw new Error(`INTEGRITY_FAILURE: Block ${e.seq} is corrupt`);
            }
            return true;
        });
    };

    return Object.freeze({ append, verifyChain });
};