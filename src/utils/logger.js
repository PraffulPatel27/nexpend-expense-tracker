import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Reference to the 'logs' collection
const logsCol = collection(db, "logs");

/**
 * Logs a user activity or system event to Firestore
 * @param {string} userId - The ID of the user performing the action (or "SYSTEM")
 * @param {string} action - The action performed (e.g., "LOGIN", "ADD_EXPENSE")
 * @param {object} details - Any additional metadata about the action
 */
export async function logActivity(userId, action, details = {}) {
    try {
        await addDoc(logsCol, {
            type: "activity",
            userId: userId || "SYSTEM",
            action,
            details,
            timestamp: Timestamp.now(),
            userAgent: window.navigator.userAgent // helps identify bot patterns
        });
    } catch (e) {
        console.error("Failed to write to activity log", e);
    }
}

/**
 * Logs caught errors or suspicious activity to Firestore
 * Acts as a custom web alternative to Crashlytics
 * @param {string} userId - The ID of the user experiencing the error
 * @param {Error|string} error - The error object or message
 * @param {string} context - Where the error occurred
 */
export async function logError(userId, error, context = "Unknown") {
    try {
        await addDoc(logsCol, {
            type: "error",
            userId: userId || "SYSTEM",
            errorMessage: error?.message || String(error),
            errorStack: error?.stack || null,
            context,
            timestamp: Timestamp.now()
        });
    } catch (e) {
        console.error("Failed to write to error log", e);
    }
}
