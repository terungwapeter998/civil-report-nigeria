const UI = Object.freeze({
    form: document.getElementById("adminLoginForm"),
    msg: document.getElementById("msg"),
    getEmail: () => document.getElementById("email")?.value || "",
    getPassword: () => document.getElementById("password")?.value || "",

    setMessage: (text) => {
        if (UI.msg) {
            UI.msg.textContent = text;
            console.log(`[AUTH_LOG]: ${text}`);
        }
    }
});

const ERRORS = Object.freeze({
    MISSING: "Required fields are empty.",
    AUTH: "Invalid credentials.",
    NETWORK: "Network error. Try again.",
    INVALID: "Invalid server response.",
    RATE_LIMIT: "Too many attempts. Wait."
});

const IdentityPort = Object.freeze({
    normalizeEmail: (email) =>
        String(email || "").trim().toLowerCase(),

    validate: (email, password) => {
        const e = String(email || "");
        const p = String(password || "");
        return (e.length > 3 && e.length < 255 && p.length > 0 && p.length < 1024);
    }
});

async function requestAdminLogin(email, password) {
    const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
    });

    if (res.status === 401) throw new Error("AUTH");
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (!res.ok) throw new Error("NETWORK");

    return res.json();
}

function isValidResponse(res) {
    return (
        res &&
        typeof res === "object" &&
        typeof res.sessionId === "string" &&
        typeof res.role === "string" &&
        typeof res.expiresAt === "number"
    );
}

async function handleAdminLogin(e) {
    e.preventDefault();

    UI.setMessage("Authenticating...");

    const emailRaw = UI.getEmail();
    const password = UI.getPassword();

    if (!IdentityPort.validate(emailRaw, password)) {
        UI.setMessage(ERRORS.MISSING);
        return;
    }

    try {
        const email = IdentityPort.normalizeEmail(emailRaw);
        const response = await requestAdminLogin(email, password);

        if (!isValidResponse(response)) {
            throw new Error("INVALID");
        }

        UI.setMessage("Access verified. Redirecting...");

        /**
         * IMPORTANT:
         * Do NOT store session in localStorage/sessionStorage.
         * Let backend cookie OR Firebase own session state.
         */

        window.location.replace("/admin/dashboard.html");

    } catch (err) {
        UI.setMessage(ERRORS[err.message] || ERRORS.NETWORK);

        // Hard reset UI state (prevents lock loops)
        if (UI.form) UI.form.reset();
    }
}

// =========================
// BOOTSTRAP (SINGLE ENTRY)
// =========================
if (UI.form) {
    UI.form.addEventListener("submit", handleAdminLogin);
} else {
    console.error("[CRITICAL]: Admin Login Form not found in DOM.");
}