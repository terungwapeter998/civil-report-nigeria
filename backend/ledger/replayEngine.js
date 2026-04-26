/**
 * STAGE 6 REPLAY ENGINE — FINAL FORM
 */

export const createReplayEngine = (hashEngine, verifyChain) => {

    /**
     * =========================================================
     * CANONICAL STATE SERIALIZER (CRITICAL MISSING PIECE)
     * =========================================================
     */
    const canonicalState = (value) => {
        if (value === null || typeof value !== "object") return value;

        if (Array.isArray(value)) {
            return value.map(canonicalState);
        }

        return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
                acc[key] = canonicalState(value[key]);
                return acc;
            }, {});
    };

    const freezeDeep = (obj) => {
        if (obj && typeof obj === "object") {
            Object.keys(obj).forEach(k => freezeDeep(obj[k]));
            Object.freeze(obj);
        }
        return obj;
    };

    const replay = (events, reducer, initialState) => {

        const ordered = [...events].sort((a, b) => a.seq - b.seq);

        /**
         * HARD INVARIANT: Ledger integrity must be validated explicitly
         */
        verifyChain(ordered);

        return ordered.reduce((state, event) => {

            const frozenState = freezeDeep(state);
            const frozenEvent = Object.freeze(event);

            const nextState = reducer(frozenState, frozenEvent);

            if (nextState === undefined || nextState === null) {
                throw new Error(`REPLAY_FAILURE@SEQ_${event.seq}`);
            }

            return nextState;

        }, initialState);
    };

    const validateSnapshot = (snapshot, events, reducer) => {

        const rebuilt = replay(events, reducer, snapshot.initialState);

        const canonical = canonicalState(rebuilt);

        const rebuiltHash = hashEngine.hashObject(
            "STATE_SNAPSHOT",
            canonical
        );

        if (rebuiltHash !== snapshot.hash) {
            throw new Error("SNAPSHOT_DRIFT_DETECTED");
        }

        return true;
    };

    return Object.freeze({
        replay,
        validateSnapshot
    });
};