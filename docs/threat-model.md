# STAGE 6 THREAT MODEL

## 1. ADVERSARY MODEL

We assume a **multi-capability adversary** with:

- ability to spoof client requests
- ability to intercept or replay tokens
- ability to inject malformed ledger events
- partial access to infrastructure logs
- ability to exploit misconfigured rules or indexes

We do NOT assume physical server compromise.

---

## 2. SYSTEM ATTACK SURFACE MAP

### 2.1 CLIENT LAYER

#### Threats:
- token replay attacks
- request tampering
- tenant ID spoofing
- malformed payload injection

#### Mitigation:
- auth verification (JWT validation)
- strict tenant binding enforcement
- schema validation at ingestion boundary

---

### 2.2 CONTROLLER LAYER

#### Threats:
- bypass of validation logic
- direct state mutation attempts
- unauthorized event generation

#### Failure Mode:
If controller writes directly to storage:
→ ledger integrity is permanently broken

#### Required Defense:
- controllers must only emit commands, never persist state

---

### 2.3 AUTH LAYER

#### Threats:
- forged JWT tokens
- role escalation via token manipulation
- stale token replay

#### System Dependency Risk:
If token authority is trusted blindly:
→ tenant isolation becomes logically false

#### Required Defense:
- identity must be validated AND context-bound
- roles must be treated as claims, not truth

---

### 2.4 LEDGER LAYER

#### Threats:
- event sequence manipulation
- hash collision injection
- prevHash chain breaking
- duplicate sequence insertion

#### Critical Failure:
If ledger integrity breaks:
→ entire system state becomes non-reconstructible

#### Required Defense:
- cryptographic chaining
- strict append-only enforcement
- deterministic serialization

---

### 2.5 EVIDENCE LAYER

#### Threats:
- silent overwrite of forensic records
- hash mismatch injection
- cross-tenant evidence leakage

#### Required Defense:
- append-only storage
- hash verification on both write and read

---

### 2.6 FIRESTORE RULES LAYER

#### Threats:
- wildcard rule expansion
- missing tenant constraints
- implicit access paths via collection groups

#### Required Defense:
- deny-by-default policy
- explicit tenant binding on all writes

---

### 2.7 INFRASTRUCTURE LAYER

#### Threats:
- secret leakage via .env
- CI/CD artifact injection
- emulator-prod divergence

#### Required Defense:
- strict environment separation
- no secret persistence in repo
- deterministic deployment pipeline

---

## 3. ATTACK PATH ANALYSIS (END-TO-END)

### PATH A: TOKEN SPOOF → TENANT BREACH

1. attacker forges JWT
2. injects fake tenantId
3. request passes controller
4. writes to ledger under wrong tenant

→ RESULT: TENANT ISOLATION FAILURE

---

### PATH B: CONTROLLER BYPASS → DIRECT WRITE

1. controller writes directly to Firestore
2. ledger is not updated
3. replay engine cannot reconstruct state

→ RESULT: SYSTEM BECOMES NON-DETERMINISTIC

---

### PATH C: HASH MANIPULATION

1. attacker injects precomputed valid-format hash
2. event accepted by storage layer
3. chain appears valid but semantic integrity is broken

→ RESULT: CRYPTOGRAPHIC TRUST FAILURE

---

### PATH D: INDEX MISROUTING

1. query uses unintended composite index
2. cross-tenant data leakage occurs via query aggregation

→ RESULT: DATA SOVEREIGNTY BREACH

---

## 4. SYSTEM RESILIENCE CONDITIONS

System is considered **secure** only if:

- ledger chain remains intact
- replay output is deterministic
- tenant isolation holds at ALL layers
- evidence hashes verify on both read/write
- no direct state mutation bypass exists

---

## 5. DETECTION STRATEGY

The system must continuously validate:

- hash chain integrity
- replay consistency checks
- tenant boundary enforcement
- schema compliance on ingestion

Detection must be:

> proactive, not reactive

---

## 6. FAILURE CLASSIFICATION

### Class 1: Recoverable
- invalid request rejected
- malformed payload discarded

### Class 2: Critical
- ledger inconsistency detected
- replay mismatch observed

→ requires audit replay

### Class 3: Fatal
- tenant isolation breach
- ledger tampering confirmed

→ system must halt writes until manual recovery

---

## 7. FINAL SECURITY PRINCIPLE

> A system that cannot detect its own inconsistency is not secure, even if it passes validation.

---

## 8. ARCHITECTURAL GUARANTEE

If all constraints are enforced:

- adversary cannot alter historical truth
- system state is always reconstructible
- tenant boundaries are mathematically enforced
- no silent corruption is possible
