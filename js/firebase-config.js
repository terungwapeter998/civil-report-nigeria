// js/firebase-config.js - High-Integrity Config for Civic Nigeria
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBTeFJd9-Px92FeB6eh4kjWR_mNwOzzvac",
    authDomain: "assembly-9d32a.firebaseapp.com",
    projectId: "assembly-9d32a",
    storageBucket: "assembly-9d32a.firebasestorage.app",
    messagingSenderId: "611720608527",
    appId: "1:611720608527:web:1709587156019bac92dc7a",
    measurementId: "G-NJS8YWV6FQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export singleton instances for system-wide state management
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);