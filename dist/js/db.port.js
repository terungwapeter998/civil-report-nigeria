/**
 * DB PORT: The Abstract Interface
 * Ensures the app doesn't leak Firebase-specific logic into the UI.
 */
export const DB_PORT = Object.freeze({
    // Reports
    SUBMIT_REPORT: "submit_report",
    GET_RESOLVED: "get_resolved_reports",

    // Auth
    LOGIN: "admin_login",
    LOGOUT: "admin_logout"
});