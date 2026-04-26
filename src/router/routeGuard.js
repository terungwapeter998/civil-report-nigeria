export class RouteGuard {
    constructor(authService) {
        this.auth = authService;
    }

    protectAdminRoute() {
        const state = this.auth.getState();

        if (state !== "ADMIN") {
            window.location.replace("/login.html");
        }
    }
}