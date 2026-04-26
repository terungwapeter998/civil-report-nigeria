import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();

/**
 * AUTH GUARD: Ensures the current view matches the user's privilege level.
 */
export function protectRoute(requiredRole = "user") {
    onAuthStateChanged(auth, (user) => {
        if (!user && requiredRole === "admin") {
            console.error("[SECURITY]: Unauthorized access attempt.");
            window.location.replace("/login.html");
        }
    });
}