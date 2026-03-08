import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, getDoc, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { logActivity } from "../utils/logger";

/**
 * Fetches all users in the system (Admin only)
 */
export async function getAllUsers() {
    try {
        const usersCol = collection(db, "users");
        const querySnapshot = await getDocs(usersCol);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
}

/**
 * Disables or enables a user account
 */
export async function updateUserStatus(adminId, userId, isDisabled) {
    if (adminId === userId && isDisabled) {
        throw new Error("Security Violation: You cannot disable your own administrator account.");
    }
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { isDisabled });

        await logActivity(adminId, "ADMIN_USER_STATUS_CHANGE", { targetUserId: userId, status: isDisabled ? "disabled" : "enabled" });
        return true;
    } catch (error) {
        console.error("Error updating user status:", error);
        throw error;
    }
}

/**
 * Deletes a user account from Firestore
 * Note: This deletes their profile and all their expenses.
 * It does not delete the Auth account itself (as client SDK cannot delete OTHER users' auth accounts without Cloud Functions).
 */
export async function deleteUserAccount(adminId, userId) {
    try {
        const batch = writeBatch(db);

        // 1. Delete all expenses associated with the user
        const expensesRef = collection(db, "expenses");
        const expQuery = query(expensesRef, where("userId", "==", userId));
        const expSnapshot = await getDocs(expQuery);
        expSnapshot.forEach((document) => {
            batch.delete(doc(db, "expenses", document.id));
        });

        // 2. Delete any rate_limits document
        batch.delete(doc(db, "rate_limits", userId));

        // 3. Delete any audit logs associated with this user
        const logsRef = collection(db, "logs");
        const logQuery = query(logsRef, where("userId", "==", userId));
        const logSnapshot = await getDocs(logQuery);
        logSnapshot.forEach((document) => {
            batch.delete(doc(db, "logs", document.id));
        });

        // 4. Delete the user's profile document
        batch.delete(doc(db, "users", userId));

        // Commit the batch delete
        await batch.commit();

        await logActivity(adminId, "ADMIN_USER_DELETE", { targetUserId: userId });
        return true;
    } catch (error) {
        console.error("Error deleting user data via Admin:", error);
        throw error;
    }
}

/**
 * Fetches the global application configuration
 */
export async function getAppConfig() {
    try {
        const configRef = doc(db, "settings", "appConfig");
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error fetching app config:", error);
        throw error;
    }
}

/**
 * Updates the global application configuration
 */
export async function updateAppConfig(adminId, config) {
    try {
        const configRef = doc(db, "settings", "appConfig");
        await setDoc(configRef, {
            ...config,
            updatedAt: new Date().toISOString(),
            updatedBy: adminId
        }, { merge: true });

        await logActivity(adminId, "ADMIN_CONFIG_UPDATE", { config });
        return true;
    } catch (error) {
        console.error("Error updating app config:", error);
        throw error;
    }
}
