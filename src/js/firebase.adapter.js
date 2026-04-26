import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBTeFJd9-Px92FeB6eh4kjWR_mNwOzzvac",
    authDomain: "assembly-9d32a.firebaseapp.com",
    projectId: "assembly-9d32a",
    storageBucket: "assembly-9d32a.firebasestorage.app",
    messagingSenderId: "611720608527",
    appId: "1:611720608527:web:1709587156019bac92dc7a",
    measurementId: "G-NJS8YWV6FQ"
};

// Initialize Firebase Instance
const app = initializeApp(firebaseConfig);

// Infrastructure Exports
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;