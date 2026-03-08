import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

/**
 * Cloud-Based API Rate Limiter
 * Tracks request counts in Firestore instead of localStorage.
 * Rule: Maximum 50 requests per 1 minute window.
 */

const MAX_REQUESTS = 50;
const WINDOW_MS = 60000; // 1 minute

export async function checkCloudRateLimit(userId) {
    if (!userId) return true; // Skip for unauthenticated (should be blocked by rules anyway)

    const rateLimitRef = doc(db, "rate_limits", userId);
    const now = Date.now();

    try {
        const docSnap = await getDoc(rateLimitRef);

        if (!docSnap.exists()) {
            // First request for this user
            await setDoc(rateLimitRef, {
                count: 1,
                windowStart: now,
                lastRequest: serverTimestamp()
            });
            return true;
        }

        const data = docSnap.data();
        const windowStart = data.windowStart;
        const currentCount = data.count;

        if (now - windowStart < WINDOW_MS) {
            // Still within the same 1-minute window
            if (currentCount >= MAX_REQUESTS) {
                throw new Error(`Cloud Rate limit exceeded. Please wait a moment.`);
            }

            // Increment count
            await updateDoc(rateLimitRef, {
                count: increment(1),
                lastRequest: serverTimestamp()
            });
        } else {
            // New window starts
            await updateDoc(rateLimitRef, {
                count: 1,
                windowStart: now,
                lastRequest: serverTimestamp()
            });
        }

        return true;
    } catch (error) {
        if (error.message.includes("Rate limit exceeded")) {
            throw error;
        }
        console.error("Cloud Rate Limiter Error:", error);
        // Fallback to allow if Firestore fails specifically (to not block the user entirely)
        return true;
    }
}
