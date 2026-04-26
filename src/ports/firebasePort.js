import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../firebase.js";

export const FirebasePort = Object.freeze({
    async signIn(email, password) {
        const res = await signInWithEmailAndPassword(auth, email, password);
        return res.user;
    },

    async signOut() {
        return signOut(auth);
    }
});