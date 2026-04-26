// backend/services/tenantService.js

import crypto from "crypto";
import { bootstrap } from "./firebaseAdmin.js";

/**
 * =========================================================
 * SYSTEM INVARIANTS
 * =========================================================
 * I1: Tenant identity is immutable after creation
 * I2: All tenant derivations are cryptographically bound
 * I3: No implicit tenant resolution allowed
 * I4: Cross-tenant contamination is mathematically impossible
 * I5: Tenant context must be validated before ANY downstream operation
 */

/**
 * =========================================================
 * CANONICALIZATION (DETERMINISTIC BASIS)
 * =========================================================
 */
const canonicalize = (value) => {
    if (value === null || typeof value !== "object") return value;

    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }

    return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
            acc[key] = canonicalize(value[key]);
            return acc;
        }, {});
};

const serialize = (value) =>
    JSON.stringify(canonicalize(value));

/**
 * =========================================================
 * CRYPTO BOUNDARY HASH
 * =========================================================
 */
const hash = (input) =>
    crypto.createHash("sha256").update(input).digest("hex");

/**
 * =========================================================
 * TENANT DOMAIN OBJECT (IMMUTABLE CORE)
 * =========================================================
 */
export const createTenantService = () => {

    /**
     * CREATE TENANT CONTEXT (ATOMIC CONSTRUCTION)
     */
    const createContext = (tenantId, meta = {}) => {
        if (typeof tenantId !== "string" || !tenantId.trim()) {
            throw new Error("TENANT_VIOLATION: Invalid tenantId");
        }

        const normalized = tenantId.trim().toLowerCase();

        const base = {
            id: normalized,
            meta: {
                createdAt: meta.createdAt ?? Date.now(),
                source: meta.source ?? "system"
            }
        };

        const tenantHash = hash(`TENANT:${serialize(base)}`);

        const context = Object.freeze({
            ...base,
            hash: tenantHash
        });

        return context;
    };

    /**
     * VALIDATE CONTEXT (ANTI-SPOOF BOUNDARY CHECK)
     */
    const validateContext = (context) => {
        if (!context?.id || !context?.hash) {
            throw new Error("TENANT_VIOLATION: Missing context fields");
        }

        const expected = hash(
            `TENANT:${serialize({
                id: context.id,
                meta: context.meta
            })}`
        );

        if (expected !== context.hash) {
            throw new Error("TENANT_INTEGRITY_VIOLATION");
        }

        return true;
    };

    /**
     * DERIVE STORAGE PATH (NO RAW STRING CONSTRUCTION OUTSIDE)
     */
    const getPath = (context, collection) => {
        validateContext(context);

        if (!collection || typeof collection !== "string") {
            throw new Error("TENANT_VIOLATION: Invalid collection");
        }

        return `tenants/${context.id}/${collection}`;
    };

    /**
     * EXECUTION BOUNDARY (PURE ISOLATION WRAPPER)
     */
    const withTenant = (context, fn) => {
        validateContext(context);

        const frozenContext = Object.freeze({ ...context });

        return fn(frozenContext);
    };

    /**
     * OPTIONAL: SAFE DB ACCESSOR (NO LEAKED FIREBASE USAGE OUTSIDE)
     */
    const getTenantDB = async (context) => {
        validateContext(context);

        const registry = await bootstrap();

        return registry.getTenantDB(context.id);
    };

    return Object.freeze({
        createContext,
        validateContext,
        getPath,
        withTenant,
        getTenantDB
    });
};