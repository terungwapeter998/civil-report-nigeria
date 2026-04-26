import crypto from "crypto";

/**
 * STAGE 6 HASH ENGINE — FINAL FORM
 * Fully canonical, byte-stable, deterministic across runtimes
 */

/**
 * RECURSIVE CANONICALIZATION (FULL NORMALIZATION)
 */
const canonicalize = (value) => {
    if (value === null || typeof value !== "object") {
        if (typeof value === "number") {
            if (!Number.isFinite(value)) {
                throw new Error("HASH_VIOLATION: Non-finite number");
            }
            return value; // KEEP IEEE-754 RAW FORM
        }

        if (typeof value === "string") {
            return value.normalize("NFC");
        }

        return value;
    }

    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }

    return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
            acc[key.normalize("NFC")] = canonicalize(value[key]);
            return acc;
        }, {});
};

/**
 * STRICT SERIALIZATION CONTRACT
 */
const serialize = (value) =>
    JSON.stringify(canonicalize(value));

/**
 * BYTE-LEVEL HASH ENGINE (NO AMBIGUITY)
 */
export const createHashEngine = () => {

    const hash = (input) => {
        if (input == null) {
            throw new Error("HASH_ERR_NULL_INPUT");
        }

        const normalized =
            typeof input === "string"
                ? input.normalize("NFC")
                : serialize(input);

        return crypto
            .createHash("sha256")
            .update(Buffer.from(normalized, "utf8"))
            .digest("hex");
    };

    /**
     * DOMAIN SEPARATION (BYTE FRAMED, NOT STRING FRAMED)
     */
    const hashObject = (namespace, obj) => {
        if (!namespace) {
            throw new Error("HASH_ERR_NAMESPACE_REQUIRED");
        }

        const ns = namespace.normalize("NFC");
        const payload = serialize(obj);

        return hash(
            Buffer.concat([
                Buffer.from(ns, "utf8"),
                Buffer.from(":", "utf8"),
                Buffer.from(payload, "utf8")
            ])
        );
    };

    /**
     * LEDGER CHAIN HASH (STRICT STATE BINDING)
     */
    const chainHash = (prevHash, event) => {
        const head = (prevHash || "GENESIS").normalize("NFC");
        const body = serialize(event);

        return hash(
            Buffer.concat([
                Buffer.from(head, "utf8"),
                Buffer.from("|", "utf8"),
                Buffer.from(body, "utf8")
            ])
        );
    };

    return Object.freeze({
        hash,
        hashObject,
        chainHash
    });
};