import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { addExpense } from "../firebase/expenseService";
import { addCustomCategory } from "../firebase/categoryService";
import { getFriendlyErrorMessage } from "../utils/errorHandler";
import { useNavigate } from "react-router-dom";
import DOMPurify from 'dompurify';
import { CURRENCIES } from "../utils/currencyFormatter";
import { DEFAULT_CATEGORIES } from "../constants/categories";
import { getAppConfig } from "../firebase/adminService";

export default function AddExpense() {
    const { currentUser, userData, setUserData } = useAuth();
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("Food");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState("expense"); // 'expense' or 'income'

    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [globalCategories, setGlobalCategories] = useState(DEFAULT_CATEGORIES);

    useEffect(() => {
        const fetchGlobalConfig = async () => {
            try {
                const config = await getAppConfig();
                if (config && config.defaultCategories) {
                    setGlobalCategories(config.defaultCategories);
                }
            } catch (e) {
                console.error("Failed to fetch global categories", e);
            }
        };
        fetchGlobalConfig();
    }, []);

    // Combine global defaults and user's custom categories
    const allCategories = [...globalCategories, ...(userData?.categories || [])];

    async function handleAddCustomCategory() {
        if (!newCategoryName.trim()) return;

        const cleanCategoryName = DOMPurify.sanitize(newCategoryName.trim());

        if (cleanCategoryName.length > 30) {
            return setError("Category name must be 30 characters or less.");
        }
        try {
            setLoading(true);
            const addedCategory = await addCustomCategory(currentUser.uid, cleanCategoryName);
            // Update local context
            setUserData(prev => ({
                ...prev,
                categories: [...(prev.categories || []), addedCategory]
            }));
            setCategory(addedCategory);
            setNewCategoryName("");
            setIsAddingCategory(false);
        } catch (err) {
            setError("Failed to add category: " + getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!title || !amount || !category || !date) {
            return setError("Please fill in all fields");
        }

        // 1. Sanitize text inputs to prevent XSS
        const cleanTitle = DOMPurify.sanitize(title.trim());

        // 2. Validate Text Lengths
        if (cleanTitle.length > 50) {
            return setError("Title must be 50 characters or less.");
        }

        // 3. Validate Amount
        let numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return setError("Amount must be greater than 0.");
        }
        if (numAmount >= 10000000) {
            return setError("Amount is too large.");
        }

        // 4. Validate Date
        const selectedDate = new Date(date);
        const today = new Date();
        const minDate = new Date();
        minDate.setFullYear(today.getFullYear() - 5); // 5 years ago max

        if (selectedDate > today) {
            return setError("Date cannot be in the future.");
        }
        if (selectedDate < minDate) {
            return setError("Date is too far in the past.");
        }

        try {
            setError("");
            setLoading(true);

            // Format amount based on type
            if (type === "expense" && numAmount > 0) {
                numAmount = -numAmount;
            } else if (type === "income" && numAmount < 0) {
                numAmount = Math.abs(numAmount);
            }

            await addExpense(currentUser.uid, {
                title: cleanTitle,
                amount: numAmount,
                category,
                date,
                type
            });

            navigate("/"); // Return to dashboard
        } catch (err) {
            setError("Failed to add transaction: " + getFriendlyErrorMessage(err));
            console.error(err);
        }
        setLoading(false);
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 font-sans">
            <div className="flex flex-col gap-4 mb-8">
                <button onClick={() => navigate("/")} className="self-start bg-transparent border-none cursor-pointer text-slate-500 font-medium hover:text-slate-800 flex items-center gap-2">&larr; Back</button>
                <h1 className="text-3xl font-bold text-slate-900 m-0 tracking-tight">Add Transaction</h1>
            </div>

            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {/* Type Toggle */}
                    <div className="flex bg-slate-100 rounded-xl p-1 mb-2">
                        <button
                            type="button"
                            onClick={() => setType("expense")}
                            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all border-none ${type === "expense" ? "bg-white text-rose-500 shadow-sm" : "bg-transparent text-slate-500 cursor-pointer hover:text-slate-700"}`}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setType("income")}
                            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all border-none ${type === "income" ? "bg-white text-emerald-500 shadow-sm" : "bg-transparent text-slate-500 cursor-pointer hover:text-slate-700"}`}
                        >
                            Income
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-slate-700 text-sm">Title</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            placeholder="e.g. Groceries"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-slate-700 text-sm">
                            Amount ({CURRENCIES.find(c => c.code === (userData?.currency || "USD"))?.symbol || "$"})
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            placeholder="0.00"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex flex-col gap-2 flex-1">
                            <div className="flex justify-between items-center">
                                <label className="font-semibold text-slate-700 text-sm">Category</label>
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                                    className="text-xs text-blue-600 font-bold bg-transparent border-none cursor-pointer hover:underline"
                                >
                                    {isAddingCategory ? "Cancel" : "+ New Category"}
                                </button>
                            </div>

                            {isAddingCategory ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Category name"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCustomCategory}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer shadow-sm hover:bg-blue-700"
                                    >
                                        Add
                                    </button>
                                </div>
                            ) : (
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium cursor-pointer"
                                >
                                    {allCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 flex-1">
                            <label className="font-semibold text-slate-700 text-sm">Date</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-6 w-full p-5 bg-slate-900 border-2 border-slate-900 text-white rounded-2xl font-bold text-lg cursor-pointer transition-all hover:bg-slate-800 hover:border-slate-800 shadow-xl shadow-slate-200"
                    >
                        {loading ? "Adding..." : "Add Transaction"}
                    </button>
                </form>
            </div>
        </div>
    );
}
