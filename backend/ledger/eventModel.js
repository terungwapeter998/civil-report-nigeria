/**
 * STAGE 6 EVENT MODEL — FINAL CONSISTENT FORM
 */

/**
 * SINGLE CANONICAL EVENT SERIALIZATION
 * Used everywhere: creation, verification, replay
 */
const canonicalEvent = (event) => ({
    type: event.type,
    payload: event.payload,
    actor: event.actor,
    tenantId: event.tenantId,
    seq: event.seq,
    prevHash: event.prevHash
});

export const createEvent = ({
    type,
    payload,
    actor,
    tenantId,
    seq,
    prevHash = "GENESIS"
}) => {

    if (seq === 0 && prevHash !== "GENESIS") {
        throw new Error("INVARIANT_VIOLATION: Genesis mismatch");
    }

    const eventBody = Object.freeze(
        canonicalEvent({
            type,
            payload,
            actor,
            tenantId,
            seq,
            prevHash
        })
    );

    const eventHash = hash(serialize(eventBody));

    return Object.freeze({
        ...eventBody,
        hash: eventHash
    });
};

/**
 * STRICT CHAIN VERIFICATION
 */
export const verifyChain = (events) => {

    const ordered = [...events].sort((a, b) => a.seq - b.seq);

    return ordered.reduce((prev, curr) => {

        const recomputed = hash(
            serialize(canonicalEvent(curr))
        );

        if (recomputed !== curr.hash) {
            throw new Error(`CORRUPTION_DETECTED@SEQ_${curr.seq}`);
        }

        if (prev && curr.prevHash !== prev.hash) {
            throw new Error(`CHAIN_BREAK@SEQ_${curr.seq}`);
        }

        return curr;
    }, null);
};

/**
 * STATE RECONSTRUCTION (PURE FUNCTION)
 */
export const rebuildState = (events, reducer, initialState) => {

    const ordered = [...events].sort((a, b) => a.seq - b.seq);

    verifyChain(ordered);

    return ordered.reduce((state, event) => {
        return reducer(state, event);
    }, initialState);
};