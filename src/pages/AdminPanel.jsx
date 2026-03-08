import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getAllUsers, updateUserStatus, deleteUserAccount, getAppConfig, updateAppConfig } from "../firebase/adminService";
import { getFriendlyErrorMessage } from "../utils/errorHandler";
import { CURRENCIES } from "../utils/currencyFormatter";
import { DEFAULT_CATEGORIES } from "../constants/categories";

const AdminPanel = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState("users"); // "users" or "settings"
    const [users, setUsers] = useState([]);
    const [config, setConfig] = useState({
        defaultCurrency: "INR",
        defaultBudget: 10000,
        defaultCategories: DEFAULT_CATEGORIES
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [newCategory, setNewCategory] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [userData, configData] = await Promise.all([
                getAllUsers(),
                getAppConfig()
            ]);
            setUsers(userData);
            if (configData) {
                setConfig({
                    defaultCurrency: configData.defaultCurrency || "INR",
                    defaultBudget: configData.defaultBudget || 10000,
                    defaultCategories: configData.defaultCategories || DEFAULT_CATEGORIES
                });
            }
        } catch (err) {
            setError("Failed to fetch data: " + getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        const action = currentStatus ? "enable" : "disable";
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await updateUserStatus(currentUser.uid, userId, !currentStatus);
            // Update local state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isDisabled: !currentStatus } : u));
        } catch (err) {
            alert(`Failed to ${action} user: ` + getFriendlyErrorMessage(err));
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure want to delete account permanently? This action CANNOT be undone and all user data will be wiped.")) return;

        try {
            await deleteUserAccount(currentUser.uid, userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
            alert("Account successfully deleted.");
        } catch (err) {
            alert("Failed to delete user: " + getFriendlyErrorMessage(err));
        }
    };

    const filteredUsers = users.filter(user =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSaveConfig = async () => {
        try {
            setSaving(true);
            await updateAppConfig(currentUser.uid, config);
            alert("Settings updated successfully!");
        } catch (err) {
            alert("Failed to update settings: " + getFriendlyErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;
        if (config.defaultCategories.includes(newCategory.trim())) {
            return alert("Category already exists");
        }
        setConfig(prev => ({
            ...prev,
            defaultCategories: [...prev.defaultCategories, newCategory.trim()]
        }));
        setNewCategory("");
    };

    const handleRemoveCategory = (cat) => {
        setConfig(prev => ({
            ...prev,
            defaultCategories: prev.defaultCategories.filter(c => c !== cat)
        }));
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen text-gray-400">Loading User Directory...</div>;

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Admin Control Panel
                    </h1>
                    <div className="text-[10px] text-gray-600 font-mono">
                        UID: {currentUser.uid}
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row bg-gray-900/50 p-1 rounded-xl mb-8 w-full sm:w-fit border border-gray-800 gap-1">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "users" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-200"}`}
                    >
                        User Directory
                    </button>
                    <button
                        onClick={() => setActiveTab("settings")}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "settings" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-200"}`}
                    >
                        App Configuration
                    </button>
                    <button
                        onClick={() => setActiveTab("monitoring")}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "monitoring" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-200"}`}
                    >
                        System Monitoring
                    </button>
                </div>

                {activeTab === "users" && (
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">User</th>
                                        <th className="px-6 py-4 font-semibold">Role</th>
                                        <th className="px-6 py-4 font-semibold text-center">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-lg font-bold text-blue-400 shadow-inner">
                                                        {user.name?.[0].toUpperCase() || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{user.name}</p>
                                                        <p className="text-xs text-gray-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${user.role === 'admin' ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isDisabled ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isDisabled ? 'bg-red-400' : 'bg-green-400'}`}></span>
                                                    {user.isDisabled ? 'Disabled' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleStatus(user.id, user.isDisabled)}
                                                        disabled={user.id === currentUser.uid}
                                                        title={user.id === currentUser.uid ? "You cannot disable your own admin account" : ""}
                                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${user.id === currentUser.uid
                                                            ? 'opacity-50 cursor-not-allowed bg-gray-800 text-gray-500 border border-gray-700'
                                                            : user.isDisabled
                                                                ? 'bg-green-600 hover:bg-green-500 text-white'
                                                                : 'bg-gray-800 hover:bg-yellow-600/20 hover:text-yellow-400 text-gray-400 border border-gray-700'
                                                            }`}
                                                    >
                                                        {user.isDisabled ? 'Enable' : 'Disable'}
                                                    </button>
                                                    {user.id !== currentUser.uid && user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 hover:bg-red-900/40 hover:text-red-400 hover:border-red-500/50 rounded-lg text-xs font-semibold transition-all"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500 text-sm">
                                                No users found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="text-blue-400">⚙️</span> General Defaults
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Default Currency</label>
                                    <select
                                        value={config.defaultCurrency}
                                        onChange={(e) => setConfig(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                    >
                                        {CURRENCIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Default Monthly Budget (₹)</label>
                                    <input
                                        type="number"
                                        value={config.defaultBudget}
                                        onChange={(e) => setConfig(prev => ({ ...prev, defaultBudget: parseInt(e.target.value) || 0 }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveConfig}
                                    disabled={saving}
                                    className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Configuration"}
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="text-purple-400">📂</span> Default Categories
                            </h2>
                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    placeholder="New category..."
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleAddCategory}
                                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl text-sm font-bold border border-gray-700"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {config.defaultCategories.map(cat => (
                                    <div key={cat} className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 px-3 py-1.5 rounded-full text-xs">
                                        <span>{cat}</span>
                                        <button
                                            onClick={() => handleRemoveCategory(cat)}
                                            className="text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-6 text-[10px] text-gray-500 italic">
                                * These categories will be available to all users by default.
                            </p>
                        </div>
                    </div>
                )}
                {activeTab === "monitoring" && (
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="text-green-400">📊</span> System Health & Monitoring
                        </h2>
                        <p className="text-gray-400 text-sm mb-8">
                            Monitor system performance, API quotas, and application errors directly through Firebase and Google Cloud consoles.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <a href="https://console.cloud.google.com/apis/dashboard" target="_blank" rel="noopener noreferrer" className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-all group block no-underline cursor-pointer">
                                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">⚡</div>
                                <h3 className="text-lg font-bold text-white mb-2">API Usage</h3>
                                <p className="text-xs text-gray-400 mb-4">Monitor Google Cloud API quotas, request volume, and backend latency.</p>
                                <span className="text-blue-400 text-sm font-bold flex items-center gap-1">Open Cloud Console &rarr;</span>
                            </a>

                            <a href="https://console.firebase.google.com/project/_/usage" target="_blank" rel="noopener noreferrer" className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 hover:border-yellow-500 transition-all group block no-underline cursor-pointer">
                                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">🔥</div>
                                <h3 className="text-lg font-bold text-white mb-2">Firebase Usage</h3>
                                <p className="text-xs text-gray-400 mb-4">Track database reads/writes, storage usage, and active connections.</p>
                                <span className="text-yellow-400 text-sm font-bold flex items-center gap-1">View Firebase Usage &rarr;</span>
                            </a>

                            <a href="https://console.firebase.google.com/project/_/crashlytics" target="_blank" rel="noopener noreferrer" className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 hover:border-red-500 transition-all group block no-underline cursor-pointer">
                                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">🚨</div>
                                <h3 className="text-lg font-bold text-white mb-2">Error Logs</h3>
                                <p className="text-xs text-gray-400 mb-4">Monitor application crashes, non-fatal errors, and stability metrics.</p>
                                <span className="text-red-400 text-sm font-bold flex items-center gap-1">Open Crashlytics &rarr;</span>
                            </a>
                        </div>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <button
                        onClick={() => window.location.href = "/"}
                        className="text-gray-500 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        </div >
    );
};

export default AdminPanel;
