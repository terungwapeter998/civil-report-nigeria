import crypto from "crypto";
import { bootstrap, canonicalHash } from "./firebaseAdmin.js";

/**
 * =========================================================
 * STAGE 6 INVARIANTS (NON-NEGOTIABLE)
 * =========================================================
 * I1: No direct Firebase exposure beyond bootstrap boundary
 * I2: All writes are idempotent by construction
 * I3: All state transitions are deterministic
 * I4: All persisted data is canonicalized before hashing
 * I5: Logical clock is the only sequencing mechanism
 * I6: No undefined values allowed
 */

/**
 * ---------------------------------------------------------
 * DEEP SANITIZATION (FAIL-CLOSED)
 * ---------------------------------------------------------
 */
const sanitize = (value) => {
    if (value === undefined) {
        throw new Error("INVARIANT_VIOLATION: undefined value detected");
    }

    if (value === null || typeof value !== "object") {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(sanitize);
    }

    const out = {};
    for (const key of Object.keys(value).sort()) {
        out[key] = sanitize(value[key]);
    }

    return out;
};

/**
 * ---------------------------------------------------------
 * IDEMPOTENCY KEY (DETERMINISTIC CONTRACT)
 * ---------------------------------------------------------
 */
const createIdempotencyKey = (namespace, payload) => {
    const canonical = canonicalHash(payload, namespace);
    return canonical;
};

/**
 * ---------------------------------------------------------
 * STORAGE PORT (HEXAGONAL EDGE)
 * NO BUSINESS LOGIC ALLOWED HERE
 * ---------------------------------------------------------
 */
export class StorageService {
    constructor({ tenantId }) {
        if (!tenantId) {
            throw new Error("INVARIANT_VIOLATION: tenantId required");
        }

        this.tenantId = tenantId;
    }

    /**
     * INTERNAL: resolved registry (deterministic bootstrap)
     */
    async _ctx() {
        const registry = await bootstrap();
        return registry;
    }

    /**
     * ---------------------------------------------------------
     * CREATE (IDEMPOTENT + REPLAY SAFE)
     * ---------------------------------------------------------
     */
    async create(collection, payload, { namespace = "GENERIC" } = {}) {
        const ctx = await this._ctx();
        const { storage, clock } = ctx;

        const clean = sanitize(payload);

        const id = createIdempotencyKey(namespace, clean);

        const existing = await storage.get(this.tenantId, collection, id);
        if (existing) {
            return {
                id,
                reused: true,
                data: existing
            };
        }

        const time = clock.next();

        const record = {
            id,
            payload: clean,
            meta: {
                tenantId: this.tenantId,
                namespace,
                hash: id,
                seq: time.seq
            }
        };

        await storage.write(this.tenantId, collection, id, record);

        return {
            id,
            reused: false,
            data: record
        };
    }

    /**
     * ---------------------------------------------------------
     * READ (STRICTLY SCOPED)
     * ---------------------------------------------------------
     */
    async get(collection, id) {
        if (!id) {
            throw new Error("INVARIANT_VIOLATION: id required");
        }

        const ctx = await this._ctx();
        return ctx.storage.get(this.tenantId, collection, id);
    }

    /**
     * ---------------------------------------------------------
     * UPDATE (DETERMINISTIC MERGE, NO FREEFORM PATCHES)
     * ---------------------------------------------------------
     */
    async update(collection, id, updates, { namespace = "GENERIC" } = {}) {
        const ctx = await this._ctx();
        const { storage, clock } = ctx;

        const current = await storage.get(this.tenantId, collection, id);

        if (!current) {
            throw new Error("STATE_VIOLATION: entity not found");
        }

        const cleanUpdates = sanitize(updates);

        const nextState = {
            ...current.payload,
            ...cleanUpdates
        };

        const newHash = canonicalHash(nextState, namespace);
        const time = clock.next();

        const updated = {
            ...current,
            payload: nextState,
            meta: {
                ...current.meta,
                hash: newHash,
                seq: time.seq
            }
        };

        await storage.write(this.tenantId, collection, id, updated);

        return {
            id,
            hash: newHash,
            seq: time.seq
        };
    }

    /**
     * ---------------------------------------------------------
     * SOFT DELETE (LEDGER PRESERVATION RULE)
     * ---------------------------------------------------------
     */
    async delete(collection, id) {
        const ctx = await this._ctx();
        const { storage, clock } = ctx;

        const existing = await storage.get(this.tenantId, collection, id);

        if (!existing) {
            throw new Error("STATE_VIOLATION: entity not found");
        }

        const time = clock.next();

        const tombstone = {
            ...existing,
            meta: {
                ...existing.meta,
                deleted: true,
                seq: time.seq
            }
        };

        await storage.write(this.tenantId, collection, id, tombstone);

        return {
            id,
            deleted: true,
            seq: time.seq
        };
    }
}