export const BackendPort = Object.freeze({
    async validate(uid) {
        const res = await fetch("/api/auth/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ uid })
        });

        if (!res.ok) {
            return { valid: false };
        }

        return res.json();
    }
});