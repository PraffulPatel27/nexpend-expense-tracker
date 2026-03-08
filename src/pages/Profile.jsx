import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { CURRENCIES } from "../utils/currencyFormatter";

export default function Profile() {
    const { currentUser, userData, setUserData, deleteAccount } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [name, setName] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleDeleteAccount() {
        if (window.confirm("Are you sure want to delete account permanently? This action CANNOT be undone and all your data will be wiped.")) {
            setDeleting(true);
            setError("");

            try {
                await deleteAccount();
                alert("Account successfully deleted.");
                // Navigate to signup/login after successful deletion
                navigate("/signup");
            } catch (err) {
                console.error("Deletion error:", err);
                if (err.code === 'auth/requires-recent-login') {
                    setError("For security reasons, please log out and log back in before deleting your account.");
                } else {
                    setError("Failed to delete account. Please try again.");
                }
            }
            setDeleting(false);
        }
    }

    useEffect(() => {
        if (!currentUser) return;

        async function fetchProfile() {
            try {
                const docRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfile(data);
                    setName(data.name || "");
                    setCurrency(data.currency || "USD");
                }
            } catch (err) {
                setError("Failed to load profile data.");
            }
            setLoading(false);
        }

        fetchProfile();
    }, [currentUser]);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const docRef = doc(db, "users", currentUser.uid);
            await updateDoc(docRef, { name, currency });
            setProfile(prev => ({ ...prev, name, currency }));
            setUserData(prev => ({ ...prev, name, currency })); // Update global context immediately
            setSuccess("Profile updated successfully!");
        } catch (err) {
            setError("Failed to update profile.");
        }
        setSaving(false);
    }

    if (loading) return <div className="flex justify-center items-center min-h-screen text-slate-500 text-lg">Loading profile...</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-6 pb-24">
            <div className="max-w-3xl mx-auto">
                <div className="flex flex-col gap-4 mb-8">
                    <button onClick={() => navigate("/")} className="self-start bg-transparent border-none text-blue-600 font-medium hover:underline flex items-center gap-2 cursor-pointer">&larr; Back to Dashboard</button>
                    <h1 className="text-3xl font-bold text-slate-900 m-0">My Profile</h1>
                </div>

                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                    {userData?.role === "admin" && (
                        <div className="mb-8 p-4 bg-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-purple-700">
                                <span className="text-2xl">🛡️</span>
                                <div>
                                    <p className="font-bold text-sm m-0">Administrator Access</p>
                                    <p className="text-xs m-0 opacity-75">You have permission to manage users and system settings.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate("/admin")}
                                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all"
                            >
                                Open Admin Panel
                            </button>
                        </div>
                    )}

                    {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium">{error}</div>}
                    {success && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 text-sm font-medium">{success}</div>}

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-4xl font-bold mb-4 shadow-md">
                            {profile?.name ? profile.name.charAt(0).toUpperCase() : currentUser.email.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-slate-500 font-medium m-0">{currentUser.email}</p>
                    </div>

                    <form onSubmit={handleSave} className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-700">Display Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="font-semibold text-slate-700">Preferred Currency</label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                            >
                                {CURRENCIES.map(c => (
                                    <option key={c.code} value={c.code}>
                                        {c.code} ({c.symbol}) - {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button type="submit" disabled={saving} className="mt-4 p-4 bg-emerald-500 border-none hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-slate-100">
                        <h3 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Once you delete your account, there is no going back. All your expenses, configurations, and profile data will be permanently wiped.
                        </p>
                        <button
                            onClick={handleDeleteAccount}
                            disabled={deleting}
                            className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                            {deleting ? "Deleting Account..." : "Delete Account"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
