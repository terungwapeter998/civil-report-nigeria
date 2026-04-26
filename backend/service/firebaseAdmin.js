// backend/services/firebaseAdmin.js

import admin from "firebase-admin";
import crypto from "crypto";

/**
 * ================================
 * 1. CONFIG VALIDATION (FAIL-CLOSED)
 * ================================
 */
const validateConfig = (env) => {
    const required = [
        "FIREBASE_PROJECT_ID",
        "FIREBASE_CLIENT_EMAIL",
        "FIREBASE_PRIVATE_KEY"
    ];

    for (const key of required) {
        if (!env[key]) {
            throw new Error(`CRITICAL_FAILURE: Missing ${key}`);
        }
    }

    return Object.freeze({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    });
};

/**
 * ================================
 * 2. DEEP FREEZE (IMMUTABILITY GUARANTEE)
 * ================================
 */
const deepFreeze = (obj) => {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach((prop) => {
        if (
            obj[prop] &&
            typeof obj[prop] === "object" &&
            !Object.isFrozen(obj[prop])
        ) {
            deepFreeze(obj[prop]);
        }
    });
    return obj;
};

/**
 * ================================
 * 3. SINGLETON (CONCURRENCY-SAFE)
 * ================================
 */
let _registryPromise = null;

/**
 * ================================
 * 4. BOOTSTRAP (ROOT OF TRUST)
 * ================================
 */
export const bootstrap = async (env = process.env) => {
    if (_registryPromise) return _registryPromise;

    _registryPromise = (async () => {
        const config = validateConfig(env);

        const app =
            admin.apps.length > 0
                ? admin.app()
                : admin.initializeApp({
                    credential: admin.credential.cert(config)
                });

        const db = app.firestore();

        db.settings({
            ignoreUndefinedProperties: false
        });

        /**
         * ================================
         * 5. CONTROLLED INTERFACE (NO RAW LEAKS)
         * ================================
         */
        const registry = {
            /**
             * TENANT-ISOLATED ACCESS
             */
            getTenantDB: (tenantId) => {
                if (!tenantId) {
                    throw new Error("INVARIANT_VIOLATION: tenantId required");
                }

                return {
                    collection: (name) =>
                        db.collection(`tenants/${tenantId}/${name}`)
                };
            },

            /**
             * AUTH (CONTROLLED)
             */
            auth: {
                verifyToken: async (token) => {
                    if (!token) {
                        throw new Error("AUTH_VIOLATION: Missing token");
                    }
                    return app.auth().verifyIdToken(token);
                }
            },

            /**
             * DUAL-TIME MODEL
             * - logical: deterministic (used for hashing / ordering)
             * - server: authoritative DB timestamp
             */
            now: () => {
                const logical = Date.now(); // later replace with injected clock if needed
                return {
                    logical,
                    server: admin.firestore.FieldValue.serverTimestamp()
                };
            }
        };

        return deepFreeze(registry);
    })();

    return _registryPromise;
};

/**
 * ================================
 * 6. CANONICALIZATION (DETERMINISM)
 * ================================
 */
const canonicalize = (obj) => {
    if (obj === null || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
        return obj.map(canonicalize);
    }

    return Object.keys(obj)
        .sort()
        .reduce((acc, key) => {
            acc[key] = canonicalize(obj[key]);
            return acc;
        }, {});
};

/**
 * ================================
 * 7. NAMESPACE HASH (LEDGER SAFE)
 * ================================
 */
export const canonicalHash = (data, namespace = "GENERIC") => {
    if (!data) {
        throw new Error("HASH_VIOLATION: Missing data");
    }

    const canonical = JSON.stringify(canonicalize(data));

    return crypto
        .createHash("sha256")
        .update(`${namespace}:${canonical}`)
        .digest("hex");
};