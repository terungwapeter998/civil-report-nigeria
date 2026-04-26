export class AuthController {
    constructor(authService, router) {
        this.auth = authService;
        this.router = router;
    }

    async login(email, password) {
        try {
            const user = await this.auth.login(email, password);

            if (user.role === "ADMIN") {
                this.router.go("/admin/dashboard.html");
            } else {
                this.router.go("/index.html");
            }

        } catch (err) {
            throw err;
        }
    }

    async logout() {
        await this.auth.logout();
        this.router.go("/login.html");
    }
}