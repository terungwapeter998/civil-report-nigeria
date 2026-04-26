/**
 * STAGE 6 AUTH SERVICE — MATHEMATICAL DOMAIN MODEL
 * Fully deterministic, cryptographically bound, ledger-safe
 */

/**
 * ==========================================
 * 1. STRONGLY CANONICAL SERIALIZATION
 * ==========================================
 */
const canonicalize = (value) => {
    if (value === null || typeof value !== "object") {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }

    const sortedKeys = Object.keys(value).sort();

    const result = {};
    for (const key of sortedKeys) {
        result[key] = canonicalize(value[key]);
    }

    return result;
};

const serialize = (value) =>
    JSON.stringify(canonicalize(value));

/**
 * ==========================================
 * 2. STRICT HASH CONTRACT (NO AMBIGUITY)
 * ==========================================
 */
const createHash = (hasher, namespace, data) => {
    const input = `${namespace}:${serialize(data)}`;

    const out = hasher(input);

    if (typeof out !== "string") {
        throw new Error("HASH_CONTRACT_VIOLATION");
    }

    return out;
};

/**
 * ==========================================
 * 3. FINGERPRINT (IMMUTABLE IDENTITY BINDING)
 * ==========================================
 */
const generateFingerprint = (hasher, claims) => {
    return createHash(hasher, "AUTH_IDENTITY", {
        uid: claims.uid,
        iss: claims.iss,
        aud: claims.aud
    });
};

/**
 * ==========================================
 * 4. AUTH SERVICE (PURE FACTORY)
 * ==========================================
 */
export const createAuthService = (tokenValidator, hasher) => {

    /**
     * VERIFY (STATE TRANSITION: UNKNOWN → IDENTITY)
     */
    const verify = async (rawToken) => {
        if (typeof rawToken !== "string" || !rawToken.trim()) {
            throw new Error("AUTH_VIOLATION: Invalid token format");
        }

        const decoded = await tokenValidator(rawToken.trim());

        if (!decoded?.uid) {
            throw new Error("AUTH_INVALID: Missing uid");
        }

        const roles = Object.freeze(
            [...new Set(decoded.roles || ["user"])].sort()
        );

        const identity = Object.freeze({
            uid: decoded.uid,
            roles,
            fingerprint: generateFingerprint(hasher, decoded),
            metadata: Object.freeze({
                iat: decoded.iat,
                exp: decoded.exp
            })
        });

        return identity;
    };

    /**
     * AUTHORIZE (PURE SET LOGIC)
     */
    const authorize = (identity, requiredPermission) => {
        const ROLE_MAP = Object.freeze({
            admin: ["read", "write", "delete"],
            user: ["read", "write"],
            guest: ["read"]
        });

        const permissions = new Set(
            identity.roles.flatMap((r) => ROLE_MAP[r] || []).sort()
        );

        if (!permissions.has(requiredPermission)) {
            throw new Error(
                `AUTHZ_DENIED:${requiredPermission}`
            );
        }

        return true;
    };

    /**
     * AUDIT EVENT (LEDGER-READY ATOMIC ENTRY)
     */
    const createAuditRecord = (identity, action, clock, hasher) => {
        if (!clock || typeof clock !== "object") {
            throw new Error("DETERMINISM_VIOLATION: Missing logical clock");
        }

        const event = Object.freeze({
            type: "AUTH_EVENT",
            subject: identity.uid,
            fingerprint: identity.fingerprint,
            action,
            seq: clock.seq,
            occurredAt: clock.ts
        });

        return Object.freeze({
            ...event,
            hash: createHash(hasher, "AUTH_EVENT", event)
        });
    };

    return Object.freeze({
        verify,
        authorize,
        createAuditRecord
    });
};