/**
 * CIVICREPORT NIGERIA — STAGE 6 (FINAL HARDENED)
 * ADMIN DASHBOARD ORCHESTRATION LAYER
 * -------------------------------------
 * GOAL:
 * Eliminate logical nondeterminism caused by client clock drift
 * WITHOUT violating frontend trust boundaries
 */

// ======================================================
// 1. UI PORT (UNCHANGED)
// ======================================================

const UI = Object.freeze({
    stats: document.getElementById("stats"),
    reports: document.getElementById("reports"),
    msg: document.getElementById("msg"),

    setMessage(text) {
        if (this.msg) this.msg.textContent = text;
    },

    clear(node) {
        if (node) node.innerHTML = "";
    }
});

// ======================================================
// 2. SERVER-TIME ATOMIC CLOCK MODEL (NEW)
// ======================================================

const TimeKernel = (() => {
    let serverOffset = 0;
    let synced = false;

    function sync(serverTime) {
        if (typeof serverTime !== "number") return;

        serverOffset = serverTime - Date.now();
        synced = true;
    }

    function now() {
        // deterministic "logical time"
        return Date.now() + serverOffset;
    }

    function isSynced() {
        return synced;
    }

    return Object.freeze({
        sync,
        now,
        isSynced
    });
})();

// ======================================================
// 3. SESSION GATE (NON-TRUSTED CHECK ONLY)
// ======================================================

function getSession() {
    try {
        const raw = sessionStorage.getItem("admin_session");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return { __error: "STORAGE_FAILURE" };
    }
}

function isSessionValid(session) {
    if (!session) return false;
    return TimeKernel.now() < session.expiresAt;
}

// ======================================================
// 4. INFRASTRUCTURE PORT
// ======================================================

async function httpGetDashboard() {
    const res = await fetch("/api/admin/dashboard", {
        method: "GET",
        credentials: "include"
    });

    if (!res.ok) throw new Error("NETWORK");

    const data = await res.json();

    // CRITICAL: server becomes time authority
    if (data.serverTime) {
        TimeKernel.sync(data.serverTime);
    }

    return data;
}

async function httpResolveReport(reportId) {
    const res = await fetch("/api/admin/resolve-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            reportId,
            clientTime: TimeKernel.now() // non-authoritative metadata only
        })
    });

    if (!res.ok) throw new Error("FAILED");
    return res.json();
}

// ======================================================
// 5. STATE STORE (DETERMINISTIC PROJECTION)
// ======================================================

const DashboardStore = (() => {
    let state = Object.freeze({
        stats: {},
        reports: []
    });

    return {
        get: () => state,
        set: (next) => {
            state = Object.freeze(next);
        }
    };
})();

// ======================================================
// 6. SAFE RENDERING (UNCHANGED SECURITY MODEL)
// ======================================================

function createReportNode(report, onResolve) {
    const wrapper = document.createElement("div");
    wrapper.className = "card";

    const title = document.createElement("h3");
    title.textContent = report.title;

    const desc = document.createElement("p");
    desc.textContent = report.description;

    const status = document.createElement("small");
    status.textContent = `Status: ${report.status}`;

    const btn = document.createElement("button");
    btn.textContent = "Mark Resolved";

    btn.addEventListener("click", () => onResolve(report.id));

    wrapper.appendChild(title);
    wrapper.appendChild(desc);
    wrapper.appendChild(status);
    wrapper.appendChild(btn);

    return wrapper;
}

function renderReports(reports, onResolve) {
    UI.clear(UI.reports);

    const fragment = document.createDocumentFragment();

    for (const r of reports) {
        fragment.appendChild(createReportNode(r, onResolve));
    }

    UI.reports.appendChild(fragment);
}

function renderStats(stats) {
    UI.clear(UI.stats);

    const items = [
        ["Total Reports", stats.totalReports ?? 0],
        ["Resolved", stats.resolved ?? 0],
        ["Pending", stats.pending ?? 0]
    ];

    for (const [label, value] of items) {
        const el = document.createElement("div");
        el.className = "card";
        el.textContent = `${label}: ${value}`;
        UI.stats.appendChild(el);
    }
}

// ======================================================
// 7. ORCHESTRATOR (NO AUTHORITY LOGIC)
// ======================================================

async function resolveReportHandler(reportId) {
    try {
        UI.setMessage("Processing...");

        const res = await httpResolveReport(reportId);

        if (!res || res.success !== true) {
            throw new Error("FAILED");
        }

        const current = DashboardStore.get();

        const updated = current.reports.map(r =>
            r.id === reportId ? { ...r, status: "RESOLVED" } : r
        );

        DashboardStore.set({
            ...current,
            reports: updated
        });

        renderReports(updated, resolveReportHandler);

        UI.setMessage("Resolved.");

    } catch {
        UI.setMessage("Resolution failed.");
    }
}

// ======================================================
// 8. INIT (DETERMINISTIC BOOTSTRAP)
// ======================================================

async function initDashboard() {
    const session = getSession();

    if (!isSessionValid(session)) {
        window.location.replace("/admin/login.html");
        return;
    }

    UI.setMessage("Loading...");

    const data = await httpGetDashboard();

    DashboardStore.set(data);

    renderStats(data.stats);
    renderReports(data.reports, resolveReportHandler);

    UI.setMessage(TimeKernel.isSynced() ? "Ready." : "Ready (unsynced time).");
}

// ======================================================
// 9. BOOT
// ======================================================

initDashboard();