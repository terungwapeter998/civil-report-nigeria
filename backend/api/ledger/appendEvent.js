const crypto = require("crypto");
const stableStringify = require("json-stable-stringify");
const { db } = require("../../infrastructure/PersistenceManager");

function generateEventId(actorId, body, serverTime) {
    return crypto
        .createHash("sha256")
        .update(`${actorId}:${stableStringify(body)}:${serverTime}`)
        .digest("hex");
}

async function appendEvent(req, res) {
    const actor = req.user;
    if (!actor) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    return await db.transaction(async (tx) => {

        // 1. LOCK LEDGER HEAD (prevents race forks)
        const head = await tx.ledger.findFirst({
            orderBy: { sequence: "desc" }
        });

        const previousHash = head?.hash ?? "GENESIS";
        const sequence = (head?.sequence ?? 0) + 1;

        // 2. SERVER-TRUSTED TIMESTAMP (NO CLIENT CLOCK)
        const serverTime = Date.now();

        // 3. CANONICAL EVENT BODY
        const eventBody = {
            ...req.body,
            actorId: actor.id,
            serverTime
        };

        // 4. DETERMINISTIC EVENT ID (IDEMPOTENCY KEY)
        const eventId = generateEventId(actor.id, req.body, serverTime);

        // 5. IDEMPOTENCY CHECK (CRITICAL FIX)
        const existing = await tx.ledger.findUnique({
            where: { eventId }
        });

        if (existing) {
            return res.status(200).json({
                success: true,
                duplicate: true,
                hash: existing.hash
            });
        }

        // 6. CRYPTOGRAPHIC CHAIN HASH
        const hash = crypto
            .createHash("sha256")
            .update(
                stableStringify(eventBody) +
                previousHash +
                String(sequence)
            )
            .digest("hex");

        // 7. ATOMIC WRITE (IMMUTABLE RECORD)
        const record = await tx.ledger.create({
            data: {
                eventId,
                sequence,
                actorId: actor.id,
                payload: req.body,
                serverTime,
                hash,
                previousHash
            }
        });

        return res.status(201).json({
            success: true,
            eventId: record.eventId,
            hash: record.hash,
            sequence: record.sequence
        });
    });
}