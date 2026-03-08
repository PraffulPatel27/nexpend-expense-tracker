import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Use process.env variables injected by Vite
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

// Initialize Firebase App Check with ReCAPTCHA v3
let appCheck = null;
if (typeof window !== "undefined" && import.meta.env.PROD) {
    const recaptchaKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;

    if (recaptchaKey) {
        // Dynamic import to avoid loading it in local dev
        import("firebase/app-check").then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
            appCheck = initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(recaptchaKey),
                isTokenAutoRefreshEnabled: true
            });
        });
    }
}

export { app, auth, googleProvider, db, appCheck };
