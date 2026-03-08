import { collection, addDoc, query, where, getDocs, orderBy, Timestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { checkCloudRateLimit } from "../utils/cloudRateLimiter";
import { logActivity } from "../utils/logger";


// Reference to the 'expenses' collection
const expensesCol = collection(db, "expenses");

/**
 * Add a new expense document to Firestore
 */
export async function addExpense(userId, expenseData) {
    try {
        await checkCloudRateLimit(userId);

        const docRef = await addDoc(expensesCol, {
            ...expenseData,
            userId,
            createdAt: Timestamp.now()
        });

        // Log the activity
        await logActivity(userId, "ADD_EXPENSE", { expenseId: docRef.id, category: expenseData.category, amount: expenseData.amount });

        return { id: docRef.id, ...expenseData };
    } catch (error) {
        console.error("Error adding document: ", error);
        throw error;
    }
}

/**
 * Update an existing expense document
 */
export async function updateExpense(userId, expenseId, updatedData) {
    try {
        await checkCloudRateLimit(userId);

        const docRef = doc(db, "expenses", expenseId);
        await updateDoc(docRef, {
            ...updatedData,
            updatedAt: Timestamp.now()
        });

        // Log the activity (userId is not natively in the signature, but we can log the action)
        await logActivity("SYSTEM", "EDIT_EXPENSE", { expenseId, category: updatedData?.category, amount: updatedData?.amount });

        return { id: expenseId, ...updatedData };
    } catch (error) {
        console.error("Error updating document: ", error);
        throw error;
    }
}

/**
 * Delete an expense document
 */
export async function deleteExpense(userId, expenseId) {
    try {
        await checkCloudRateLimit(userId);

        const docRef = doc(db, "expenses", expenseId);
        await deleteDoc(docRef);

        await logActivity("SYSTEM", "DELETE_EXPENSE", { expenseId });

        return expenseId;
    } catch (error) {
        console.error("Error deleting document: ", error);
        throw error;
    }
}

/**
 * Fetch all expenses for a specific user
 */
export async function getUserExpenses(userId) {
    try {
        await checkCloudRateLimit(userId);

        const q = query(
            expensesCol,
            where("userId", "==", userId)
        );

        const querySnapshot = await getDocs(q);
        const expenses = [];

        querySnapshot.forEach((doc) => {
            expenses.push({ id: doc.id, ...doc.data() });
        });

        // Sort in memory by createdAt descending to ensure latest transactions (even on same date) show first
        return expenses.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            if (timeB !== timeA) return timeB - timeA;
            return (b.createdAt?.nanoseconds || 0) - (a.createdAt?.nanoseconds || 0);
        });
    } catch (error) {
        console.error("Error getting documents: ", error);
        throw error;
    }
}
