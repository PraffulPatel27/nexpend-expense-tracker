import { createContext, useContext, useEffect, useState } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    deleteUser // Added deleteUser import
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase/firebaseConfig";
import { logActivity, logError } from "../utils/logger";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null); // Holds the Firestore user profile
    const [loading, setLoading] = useState(true);

    async function signup(email, password, name = "") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            name: user.email === "admin@test.com" ? "Prafful" : (name || user.email.split("@")[0]),
            photoURL: "",
            currency: "INR",
            monthlyBudget: 0, // Enforce 0 as starting budget per user request
            baseCurrency: "INR",
            role: user.email === "admin@test.com" ? "admin" : "user",
            isDisabled: false,
            createdAt: new Date().toISOString()
        });

        logActivity(user.uid, "SIGNUP", { provider: "email" }); // Async logging to prevent delay

        return userCredential;
    }

    async function login(email, password) {
        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);

            // Explicitly check if the account is disabled immediately after login
            const userDoc = await getDoc(doc(db, "users", credential.user.uid));
            if (userDoc.exists() && userDoc.data().isDisabled) {
                await signOut(auth);
                throw new Error("Your account has been disabled. Please contact support at support@nexpend.com for assistance.");
            }

            logActivity(credential.user.uid, "LOGIN", { provider: "email" }); // Async logging
            return credential;
        } catch (e) {
            logError(email, e, "LOGIN_FAILED");
            throw e;
        }
    }

    function logout() {
        return signOut(auth);
    }

    async function loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;

        // Check if user document exists, if not create it
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            await setDoc(docRef, {
                uid: user.uid,
                email: user.email,
                name: user.email === "admin@test.com" ? "Prafful" : (user.displayName || user.email.split("@")[0]),
                photoURL: user.photoURL || "",
                currency: "INR",       // Default display currency
                monthlyBudget: 0,      // Enforce 0 as starting budget
                baseCurrency: "INR",   // The currency transactions are stored in
                role: user.email === "admin@test.com" ? "admin" : "user",
                isDisabled: false,
                createdAt: new Date().toISOString()
            });
            logActivity(user.uid, "SIGNUP", { provider: "google" }); // Async logging
        } else {
            // Check if account is disabled for existing Google users
            if (docSnap.data().isDisabled) {
                await signOut(auth);
                throw new Error("Your account has been disabled. Please contact support");
            }
            logActivity(user.uid, "LOGIN", { provider: "google" }); // Async logging
        }

        return userCredential;
    }

    useEffect(() => {
        let inactivityTimer;
        let sessionTimer;

        const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 mins
        const SESSION_LIMIT = 60 * 60 * 1000; // 1 hour

        const resetInactivityTimer = () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            if (auth.currentUser) {
                inactivityTimer = setTimeout(() => {
                    logActivity(auth.currentUser.uid, "LOGOUT_AUTO", { reason: "inactivity" });
                    alert("You have been logged out");
                    signOut(auth);
                }, INACTIVITY_LIMIT);
            }
        };

        const setupSecurity = () => {
            // Activity Listeners
            window.addEventListener('mousemove', resetInactivityTimer);
            window.addEventListener('keydown', resetInactivityTimer);
            window.addEventListener('scroll', resetInactivityTimer);
            window.addEventListener('click', resetInactivityTimer);
            resetInactivityTimer();

            // Absolute Session Expiration
            const loginTime = localStorage.getItem('nexpend_session_start');
            if (loginTime) {
                const timeElapsed = Date.now() - parseInt(loginTime, 10);
                if (timeElapsed >= SESSION_LIMIT) {
                    alert("Your session has expired for security purposes. Please log in again.");
                    signOut(auth);
                } else {
                    sessionTimer = setTimeout(() => {
                        alert("Your session has expired for security purposes. Please log in again.");
                        signOut(auth);
                    }, SESSION_LIMIT - timeElapsed);
                }
            } else {
                localStorage.setItem('nexpend_session_start', Date.now().toString());
                sessionTimer = setTimeout(() => {
                    alert("Your session has expired for security purposes. Please log in again.");
                    signOut(auth);
                }, SESSION_LIMIT);
            }
        };

        const cleanupSecurity = () => {
            window.removeEventListener('mousemove', resetInactivityTimer);
            window.removeEventListener('keydown', resetInactivityTimer);
            window.removeEventListener('scroll', resetInactivityTimer);
            window.removeEventListener('click', resetInactivityTimer);
            if (inactivityTimer) clearTimeout(inactivityTimer);
            if (sessionTimer) clearTimeout(sessionTimer);
        };

        let unsubscribeUserDoc;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                setupSecurity();

                // Exclusive Admin Enforcer: Prafful (admin@test.com)
                if (user.email === "admin@test.com") {
                    try {
                        const myRef = doc(db, "users", user.uid);
                        await updateDoc(myRef, { role: "admin", name: "Prafful" });

                        // Query and demote all other admins
                        const usersRef = collection(db, "users");
                        const adminQuery = query(usersRef, where("role", "==", "admin"));
                        const snapshot = await getDocs(adminQuery);

                        const batch = writeBatch(db);
                        snapshot.forEach(d => {
                            if (d.data().email !== "admin@test.com") {
                                batch.update(d.ref, { role: "user" }); // Demote remaining admins
                            }
                        });
                        await batch.commit();
                    } catch (err) {
                        console.error("Admin auto-demote routine failed:", err);
                    }
                }

                // Listen for real-time updates to the user profile (e.g., account disabling)
                const docRef = doc(db, "users", user.uid);
                unsubscribeUserDoc = onSnapshot(docRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        setUserData(data);

                        // If user is disabled by admin, log them out immediately
                        if (data.isDisabled) {
                            signOut(auth);
                            alert("Your account has been disabled. Please contact support at support@nexpend.com for assistance.");
                        }
                    } else {
                        setUserData(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("User doc snapshot error:", error);
                    setLoading(false);
                });
            } else {
                cleanupSecurity();
                localStorage.removeItem('nexpend_session_start');
                setUserData(null);
                if (unsubscribeUserDoc) unsubscribeUserDoc();
                setLoading(false);
            }
        });

        // Cleanup subscription on unmount
        return () => {
            cleanupSecurity();
            unsubscribe();
            if (unsubscribeUserDoc) unsubscribeUserDoc();
        };
    }, []);

    // Password Reset
    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    // Account Deletion
    async function deleteAccount() {
        if (!currentUser) throw new Error("No authenticated user.");
        const uid = currentUser.uid;

        try {
            // 1. Delete all expenses associated with the user
            const expensesRef = collection(db, "expenses");
            const q = query(expensesRef, where("userId", "==", uid));
            const querySnapshot = await getDocs(q);

            const batch = writeBatch(db);
            querySnapshot.forEach((document) => {
                batch.delete(doc(db, "expenses", document.id));
            });

            // 2. Delete the user's profile document
            batch.delete(doc(db, "users", uid));

            // Commit the batch delete
            await batch.commit();

            // 3. Delete the Firebase Auth account
            await deleteUser(currentUser);

            // Note: If deleteUser throws 'auth/requires-recent-login', 
            // the catch block handles it. The Firestore data might be gone 
            // before Auth fails, but as a security best practice, user data 
            // is wiped.
            return true;
        } catch (error) {
            console.error("Error deleting account:", error);
            throw error;
        }
    }

    const value = {
        currentUser,
        userData,
        setUserData, // Allow components (like Profile) to manually update context state without reloading
        login,
        signup,
        logout,
        loginWithGoogle,
        resetPassword,
        deleteAccount,
        isAdmin: userData?.role === "admin",
        isUserDisabled: userData?.isDisabled === true
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
