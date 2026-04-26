# STAGE 6 ARCHITECTURE SPECIFICATION

## 1. SYSTEM OVERVIEW

This system is a **deterministic, event-sourced, multi-tenant civic infrastructure platform**.

All state is derived from:
- append-only ledger events
- cryptographically validated evidence
- deterministic replay engine

No direct state mutation is considered valid outside event generation.

---

## 2. CORE SYSTEM INVARIANTS

### I1 — SINGLE SOURCE OF TRUTH
The ledger is the only authoritative state system.

- No database document is authoritative on its own
- All state must be reconstructible via event replay

---

### I2 — IMMUTABILITY OF HISTORY
Once an event is written:

- it cannot be modified
- it cannot be deleted
- it can only be appended upon

Any violation = system corruption

---

### I3 — TENANT ISOLATION IS HARD BOUNDARY
Tenant identity is enforced at:

- auth layer
- middleware layer
- storage layer
- ledger layer

Cross-tenant access is a system failure, not a permission denial.

---

### I4 — DETERMINISTIC EXECUTION
Given identical inputs:

- same event stream
- same initial state
- same reducer logic

The system MUST always produce identical output state.

No randomness is allowed unless explicitly injected via deterministic clock.

---

### I5 — NO DIRECT STATE MUTATION
There is no “update” model.

All changes must occur via:
