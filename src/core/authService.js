export class AuthService {
    constructor(firebasePort, backendPort) {
        this.firebase = firebasePort;
        this.backend = backendPort;
        this.state = AuthState.UNAUTHENTICATED;
        this.user = null;
    }

    async login(email, password) {
        this.state = AuthState.LOADING;

        const firebaseUser = await this.firebase.signIn(email, password);
        const session = await this.backend.validate(firebaseUser.uid);

        if (!session.valid) {
            await this.firebase.signOut();
            this.state = AuthState.UNAUTHENTICATED;
            throw new Error("UNAUTHORIZED");
        }

        this.user = {
            uid: firebaseUser.uid,
            role: session.role
        };

        this.state =
            session.role === "ADMIN"
                ? AuthState.ADMIN
                : AuthState.AUTHENTICATED;

        return this.user;
    }

    async logout() {
        await this.firebase.signOut();
        this.user = null;
        this.state = AuthState.UNAUTHENTICATED;
    }

    getState() {
        return this.state;
    }

    getUser() {
        return this.user;
    }
}