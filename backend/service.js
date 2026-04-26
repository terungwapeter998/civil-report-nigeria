/**
 * STAGE 6 SERVICE COMPOSITION ROOT — FINAL FORM
 */

export const createServiceLayer = (dependencies) => {

    /**
     * =========================================================
     * DEEP IMMUTABILITY (STRUCTURAL + BEHAVIORAL HARDENING)
     * =========================================================
     */
    const deepFreeze = (obj) => {
        if (obj === null || typeof obj !== "object") return obj;

        Object.getOwnPropertyNames(obj).forEach(prop => {
            const value = obj[prop];

            if (value && typeof value === "object" && !Object.isFrozen(value)) {
                deepFreeze(value);
            }

            if (typeof value === "function") {
                Object.freeze(value);
            }
        });

        return Object.freeze(obj);
    };

    /**
     * =========================================================
     * STRICT CONTRACT MODEL (STRUCTURE + BEHAVIOR)
     * =========================================================
     */
    const REQUIRED_CONTRACTS = {
        auth: ["verify", "authorize"],
        tenant: ["createContext", "validateContext"],
        crypto: ["hash", "hashObject", "chainHash"],
        ledger: ["createEvent", "verifyChain"],
        replay: ["replay", "validateSnapshot"]
    };

    const services = {
        auth: dependencies.authService,
        tenant: dependencies.tenantService,
        crypto: dependencies.hashEngine,
        ledger: dependencies.eventModel,
        replay: dependencies.replayEngine
    };

    /**
     * =========================================================
     * BOOT-TIME CONTRACT VALIDATION
     * =========================================================
     */
    const validateInterfaces = () => {

        Object.entries(REQUIRED_CONTRACTS).forEach(([key, methods]) => {

            if (!services[key]) {
                throw new Error(`BOOT_FAILURE: Missing service ${key}`);
            }

            methods.forEach(method => {
                const fn = services[key][method];

                if (typeof fn !== "function") {
                    throw new Error(`CONTRACT_VIOLATION: ${key}.${method}`);
                }

                /**
                 * OPTIONAL STAGE 6 HARDENING:
                 * Detect async vs sync mismatch drift
                 */
                if (fn.constructor?.name === "AsyncFunction") {
                    throw new Error(`ASYNC_VIOLATION: ${key}.${method} must be deterministic sync contract`);
                }
            });
        });
    };

    validateInterfaces();

    /**
     * =========================================================
     * DETERMINISTIC SYSTEM IDENTITY (NO TIME DEPENDENCY)
     * =========================================================
     */
    const systemId = "SERVICE_LAYER_v6";

    /**
     * =========================================================
     * IMMUTABLE REGISTRY EXPORT
     * =========================================================
     */
    return deepFreeze({
        ...services,
        systemId
    });
};