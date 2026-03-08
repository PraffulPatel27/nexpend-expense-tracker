import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { checkCloudRateLimit } from "../utils/cloudRateLimiter";
import { logActivity } from "../utils/logger";

/**
 * Adds a custom category to the user's profile in Firestore.
 * @param {string} userId - The unique ID of the user.
 * @param {string} categoryName - The name of the new category.
 */
export async function addCustomCategory(userId, categoryName) {
    if (!categoryName || categoryName.trim() === "") {
        throw new Error("Category name cannot be empty.");
    }

    try {
        await checkCloudRateLimit(userId);

        const userDocRef = doc(db, "users", userId);

        await updateDoc(userDocRef, {
            categories: arrayUnion(categoryName.trim())
        });

        await logActivity(userId, "ADD_CATEGORY", { category: categoryName.trim() });

        return categoryName.trim();
    } catch (error) {
        console.error("Error adding custom category:", error);
        throw error;
    }
}

