import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { updateExpense } from "../firebase/expenseService";
import { addCustomCategory } from "../firebase/categoryService";
import { getFriendlyErrorMessage } from "../utils/errorHandler";
import DOMPurify from 'dompurify';
import { DEFAULT_CATEGORIES } from "../constants/categories";

export default function EditExpense() {
    const { id } = useParams();
    const { currentUser, userData, setUserData } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("Food");
    const [date, setDate] = useState("");
    const [type, setType] = useState("expense"); // 'income' or 'expense'

    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [savingCategory, setSavingCategory] = useState(false);

    const allCategories = [...DEFAULT_CATEGORIES, ...(userData?.categories || [])];

    async function handleAddCustomCategory() {
        if (!newCategoryName.trim()) return;

        const cleanCategoryName = DOMPurify.sanitize(newCategoryName.trim());

        if (cleanCategoryName.length > 30) {
            return alert("Category name must be 30 characters or less.");
        }
        try {
            setSavingCategory(true);
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
            alert("Failed to add category: " + getFriendlyErrorMessage(err));
        } finally {
            setSavingCategory(false);
        }
    }

    useEffect(() => {
        const fetchTransaction = async () => {
            try {
                const docRef = doc(db, "expenses", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Basic security: Ensure user owns this transaction
                    if (data.userId !== currentUser.uid) {
                        alert("Unauthorized");
                        navigate("/");
                        return;
                    }
                    setTitle(data.title);
                    setAmount(Math.abs(data.amount));
                    setCategory(data.category);
                    setDate(data.date);
                    setType(data.type || (data.amount > 0 ? "income" : "expense"));
                } else {
                    alert("Transaction not found");
                    navigate("/");
                }
            } catch (error) {
                console.error("Error fetching transaction:", error);
            }
            setLoading(false);
        };
        fetchTransaction();
    }, [id, currentUser, navigate]);

    const handleUpdate = async (e) => {
        e.preventDefault();

        if (!title || !amount || !category || !date) {
            return alert("Please fill in all fields");
        }

        // 1. Sanitize text inputs
        const cleanTitle = DOMPurify.sanitize(title.trim());

        // 2. Validate Text Lengths
        if (cleanTitle.length > 50) {
            return alert("Title must be 50 characters or less.");
        }

        // 3. Validate Amount
        let numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return alert("Amount must be greater than 0.");
        }
        if (numAmount >= 10000000) {
            return alert("Amount is too large.");
        }

        // 4. Validate Date
        const selectedDate = new Date(date);
        const today = new Date();
        const minDate = new Date();
        minDate.setFullYear(today.getFullYear() - 5);

        if (selectedDate > today) {
            return alert("Date cannot be in the future.");
        }
        if (selectedDate < minDate) {
            return alert("Date is too far in the past.");
        }

        try {
            const finalAmount = type === "income" ? Math.abs(numAmount) : -Math.abs(numAmount);
            await updateExpense(currentUser.uid, id, {
                title: cleanTitle,
                amount: finalAmount,
                category,
                date,
                type
            });
            navigate("/");
        } catch (error) {
            alert("Update failed: " + getFriendlyErrorMessage(error));
        }
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 pb-24">
            <div className="w-full max-w-lg bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 m-0">Edit Transaction</h2>
                    <button onClick={() => navigate("/")} className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer">
                        Cancel
                    </button>
                </div>

                <form onSubmit={handleUpdate} className="flex flex-col gap-6">
                    {/* Type Toggle */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setType("expense")}
                            className={`flex - 1 py - 3 rounded - xl font - bold transition - all border - none cursor - pointer ${type === "expense" ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setType("income")}
                            className={`flex - 1 py - 3 rounded - xl font - bold transition - all border - none cursor - pointer ${type === "income" ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                        >
                            Income
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g., Grocery Shopping"
                                className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Amount</label>
                            <input
                                required
                                type="number"
                                placeholder="0.00"
                                className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold text-xl"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-semibold text-slate-700">Category</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingCategory(!isAddingCategory)}
                                        className="text-xs text-blue-600 font-bold bg-transparent border-none cursor-pointer hover:underline"
                                    >
                                        {isAddingCategory ? "Cancel" : "+ New"}
                                    </button>
                                </div>

                                {isAddingCategory ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="New Category"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            className="flex-1 p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 text-sm"
                                        />
                                        <button
                                            type="button"
                                            disabled={savingCategory}
                                            onClick={handleAddCustomCategory}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-2xl text-xs font-bold border-none cursor-pointer shadow-sm hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {savingCategory ? "..." : "Add"}
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        {allCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={`w - full py - 5 rounded - 2xl text - white font - bold text - lg shadow - xl mt - 6 border - none cursor - pointer transition - all hover: bg - opacity - 90 ${type === "expense"
                            ? "bg-red-600 shadow-red-200"
                            : "bg-green-600 shadow-green-200"
                            } `}
                    >
                        {type === "expense" ? "Save Expense" : "Save Income"}
                    </button>
                </form>
            </div>
        </div>
    );
}
