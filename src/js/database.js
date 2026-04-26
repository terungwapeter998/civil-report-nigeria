import { db, storage } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/**
 * Appends a civic report to the secure ledger.
 */
export async function submitReportToLedger(title, description, location, category, file) {
    let fileUrl = null;

    try {
        // 1. Handle File Upload (Evidence)
        if (file) {
            const storageRef = ref(storage, `civic_reports/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            fileUrl = await getDownloadURL(snapshot.ref);
        }

        // 2. Commit Document to Firestore
        const docRef = await addDoc(collection(db, "civic_reports"), {
            title,
            description,
            location,
            category,
            evidenceUrl: fileUrl,
            status: "pending_verification",
            timestamp: serverTimestamp(),
            protocol: "Stage-6-Deterministic-Ledger"
        });

        return docRef.id; // This is your unique Report Hash
    } catch (error) {
        console.error("Ledger Write Error:", error);
        throw error;
    }
}