import { db } from "./firebase"; // Adjust path to your config file
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const submitReport = async () => {
    try {
        const docRef = await addDoc(collection(db, "civil_reports"), {
            type: "Initial Test",
            description: "Verifying connection to assembly-9d32a",
            timestamp: serverTimestamp(),
            reporter_uid: "system_test" // Ensure your rules allow this or use an actual UID
        });
        console.log("Document written with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
};