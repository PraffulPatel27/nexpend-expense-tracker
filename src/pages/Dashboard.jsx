import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { getUserExpenses, deleteExpense } from "../firebase/expenseService";
import { formatCurrency, CURRENCIES } from "../utils/currencyFormatter";
import { useExchangeRate } from "../hooks/useExchangeRate";
import { getFriendlyErrorMessage } from "../utils/errorHandler";


// Icons 
const HomeIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
const UserIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
const LogoutIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
const PlusIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
const TrashIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
const EditIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
const ChartIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
const ShieldIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>

export default function Dashboard() {
    const { currentUser, userData, setUserData, logout } = useAuth();
    const navigate = useNavigate();

    // State
    const [userName, setUserName] = useState("");
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ balance: 0, income: 0, expenses: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortOrder, setSortOrder] = useState("desc");

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("all"); // all | weekly | monthly
    const [filterFrom, setFilterFrom] = useState(""); // YYYY-MM-DD
    const [filterTo, setFilterTo] = useState("");     // YYYY-MM-DD

    // Budget state
    const [budgetInput, setBudgetInput] = useState("");
    const [savingBudget, setSavingBudget] = useState(false);

    // Live currency conversion — must be at top level (Rules of Hooks)
    // baseCurrency = currency transactions were stored in (always "INR" for existing users)
    // userCurrencyCode = the display currency the user has currently selected
    const baseCurrency = userData?.baseCurrency || "INR";
    const userCurrencyCode = userData?.currency || "INR";
    const { convert, exchangeRate, rateLoading, rateError } = useExchangeRate(baseCurrency, userCurrencyCode);

    const fetchData = async () => {
        if (!currentUser) return;
        try {
            // Fetch User Name
            const docRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setUserName(docSnap.data().name || "User");
            }

            // Fetch Expenses
            const txData = await getUserExpenses(currentUser.uid);
            setTransactions(txData);

            // Calculate Summary
            let totalIncome = 0;
            let totalExpenses = 0;

            txData.forEach(tx => {
                const amount = Number(tx.amount);
                if (tx.type === "income" || tx.amount > 0) totalIncome += Math.abs(amount);
                else totalExpenses += Math.abs(amount);
            });

            setSummary({
                balance: totalIncome - totalExpenses,
                income: totalIncome,
                expenses: totalExpenses
            });

        } catch (err) {
            console.error("Error fetching data:", err);
            setError(getFriendlyErrorMessage(err) || "Failed to load transactions.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [currentUser]);

    async function handleDelete(id, e) {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this transaction?")) return;

        try {
            await deleteExpense(currentUser.uid, id);
            // Update local state and summary
            setTransactions(prev => {
                const updated = prev.filter(tx => tx.id !== id);
                // Also recalculate summary from updated list
                let totalIncome = 0;
                let totalExpenses = 0;
                updated.forEach(tx => {
                    const amount = Number(tx.amount);
                    if (tx.type === "income" || tx.amount > 0) totalIncome += Math.abs(amount);
                    else totalExpenses += Math.abs(amount);
                });
                setSummary({
                    balance: totalIncome - totalExpenses,
                    income: totalIncome,
                    expenses: totalExpenses
                });
                return updated;
            });
        } catch (err) {
            alert("Failed to delete transaction: " + getFriendlyErrorMessage(err));
        }
    }

    async function handleLogout() {
        try {
            await logout();
            navigate("/login");
        } catch (err) {
            console.error(err);
        }
    }

    async function handleCurrencyChange(e) {
        const newCurrency = e.target.value;
        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            await updateDoc(userDocRef, { currency: newCurrency });
            setUserData(prev => ({ ...prev, currency: newCurrency }));
        } catch (err) {
            console.error("Error updating currency:", err);
            alert("Failed to update currency preference.");
        }
    }

    async function handleSaveBudget() {
        const amount = parseFloat(budgetInput);
        if (!amount || amount <= 0) return alert("Please enter a valid budget amount.");
        try {
            setSavingBudget(true);
            const userDocRef = doc(db, "users", currentUser.uid);
            await updateDoc(userDocRef, { monthlyBudget: amount });
            setUserData(prev => ({ ...prev, monthlyBudget: amount }));
            setBudgetInput("");
        } catch (err) {
            alert("Failed to save budget: " + getFriendlyErrorMessage(err));
        } finally {
            setSavingBudget(false);
        }
    }

    if (loading) return <div className="flex justify-center items-center min-h-screen text-slate-500 text-lg">Loading Dashboard...</div>;

    // Format + convert amount using live exchange rate
    const formatAmount = (amount) => {
        const converted = convert(Math.abs(Number(amount)));
        return formatCurrency(converted, userCurrencyCode);
    };

    // Budget calculations — current calendar month only
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthlySpent = transactions
        .filter(tx => tx.amount < 0 && tx.date?.startsWith(currentYearMonth))
        .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
    const monthlyBudget = userData?.monthlyBudget || 0;
    const remaining = monthlyBudget - monthlySpent;
    const spentPercent = monthlyBudget > 0 ? Math.min((monthlySpent / monthlyBudget) * 100, 100) : 0;
    const isOverBudget = monthlyBudget > 0 && monthlySpent > monthlyBudget;
    const isNearBudget = monthlyBudget > 0 && !isOverBudget && spentPercent >= 80;

    // Sort transactions based on current state
    const sortedTransactions = [...transactions].sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        if (sortOrder === "desc") {
            if (timeB !== timeA) return timeB - timeA;
            return (b.createdAt?.nanoseconds || 0) - (a.createdAt?.nanoseconds || 0);
        } else {
            if (timeA !== timeB) return timeA - timeB;
            return (a.createdAt?.nanoseconds || 0) - (b.createdAt?.nanoseconds || 0);
        }
    });

    // --- Search & Filter derived data ---

    // Get range bounds for quick time-filter pills
    const getQuickFromDate = () => {
        const d = new Date();
        if (activeFilter === "weekly") { d.setDate(d.getDate() - 7); }
        else if (activeFilter === "monthly") { d.setDate(1); }
        return activeFilter === "all" ? null : d.toISOString().split("T")[0];
    };
    const quickFromDate = getQuickFromDate();

    // Apply all filters + search
    const filteredTransactions = sortedTransactions.filter(tx => {
        const txDate = tx.date || "";
        // Quick time filter (no custom range set)
        if (!filterFrom && !filterTo && quickFromDate && txDate && txDate < quickFromDate) return false;
        // Custom date range filter
        if (filterFrom && txDate && txDate < filterFrom) return false;
        if (filterTo && txDate && txDate > filterTo) return false;
        // Search query — matches title, category, date, or amount
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const amt = String(Math.abs(Number(tx.amount)));
            if (
                !tx.title?.toLowerCase().includes(q) &&
                !tx.category?.toLowerCase().includes(q) &&
                !txDate.includes(q) &&
                !amt.includes(q)
            ) return false;
        }
        return true;
    });

    // Show all when filtering active, else limit to 5
    const isFiltering = searchQuery.trim() || activeFilter !== "all" || filterFrom || filterTo;
    const displayedTransactions = isFiltering ? filteredTransactions : filteredTransactions.slice(0, 5);

    return (
        <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-6 pb-24">

            <main className="max-w-6xl mx-auto">
                {/* Header Phase */}
                <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                        <p className="text-slate-500 m-0 text-base font-medium">Welcome back,</p>
                        <h1 className="text-slate-900 m-0 mt-1 text-3xl md:text-5xl font-bold tracking-tight">{userName}</h1>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Currency</label>
                        <select
                            value={userData?.currency || "INR"}
                            onChange={handleCurrencyChange}
                            className="bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-xl font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                        >
                            {CURRENCIES.map(c => (
                                <option key={c.code} value={c.code}>
                                    {c.code} ({c.symbol})
                                </option>
                            ))}
                        </select>

                        {/* Live exchange rate indicator */}
                        {baseCurrency !== userCurrencyCode && (
                            <div className="flex items-center gap-1.5">
                                {rateLoading ? (
                                    <span className="text-xs text-slate-400 animate-pulse">⏳ Fetching live rate…</span>
                                ) : rateError ? (
                                    <span className="text-xs text-rose-500">⚠️ {rateError}</span>
                                ) : (
                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        🌐 Live: 1 {baseCurrency} = {exchangeRate.toFixed(4)} {userCurrencyCode}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                    <div className="bg-slate-900 bg-gradient-to-br from-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl shadow-xl flex flex-col justify-center">
                        <p className="text-slate-400 m-0 mb-2 font-medium">Total Balance</p>
                        <h2 className="text-white m-0 text-4xl md:text-5xl font-bold tracking-tight">
                            {summary.balance < 0 ? '-' : ''}{formatAmount(summary.balance)}
                        </h2>
                    </div>
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
                        <p className="text-slate-500 m-0 mb-2 font-medium">Total Income</p>
                        <h2 className="text-emerald-500 m-0 text-3xl md:text-4xl font-bold tracking-tight">{formatAmount(summary.income)}</h2>
                    </div>
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
                        <p className="text-slate-500 m-0 mb-2 font-medium">Total Expenses</p>
                        <h2 className="text-rose-500 m-0 text-3xl md:text-4xl font-bold tracking-tight">-{formatAmount(summary.expenses)}</h2>
                    </div>
                </div>

                {/* Monthly Budget Card */}
                <div className={`rounded-3xl p-6 md:p-8 mb-8 border ${isOverBudget ? "bg-rose-50 border-rose-200" :
                    isNearBudget ? "bg-amber-50 border-amber-200" :
                        "bg-white border-slate-100 shadow-sm"
                    }`}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="m-0 text-slate-900 text-lg font-bold">Monthly Budget</h3>
                            <p className="m-0 mt-1 text-slate-500 text-sm">{now.toLocaleString("default", { month: "long", year: "numeric" })}</p>
                        </div>
                        {isOverBudget && (
                            <span className="bg-rose-100 text-rose-600 text-xs font-bold px-3 py-1 rounded-full">⚠️ Over Budget!</span>
                        )}
                        {isNearBudget && (
                            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">⚠️ Near Limit</span>
                        )}
                    </div>

                    {monthlyBudget > 0 ? (
                        <>
                            {/* Progress Bar */}
                            <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
                                <div
                                    className={`h-3 rounded-full transition-all duration-700 ${isOverBudget ? "bg-rose-500" : isNearBudget ? "bg-amber-500" : "bg-emerald-500"
                                        }`}
                                    style={{ width: `${spentPercent}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-slate-500 text-sm m-0 mb-1">Spent this month</p>
                                    <p className={`text-2xl font-bold m-0 ${isOverBudget ? "text-rose-600" : "text-slate-900"}`}>{formatAmount(monthlySpent)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-sm m-0 mb-1">{isOverBudget ? "Over by" : "Remaining"}</p>
                                    <p className={`text-2xl font-bold m-0 ${isOverBudget ? "text-rose-600" : "text-emerald-600"}`}>{formatAmount(Math.abs(remaining))}</p>
                                </div>
                            </div>
                            <p className="text-slate-400 text-xs mt-3 m-0 text-right">
                                Budget: {formatAmount(monthlyBudget)}
                                <button
                                    onClick={() => { setBudgetInput(String(monthlyBudget)); setUserData(prev => ({ ...prev, monthlyBudget: 0 })); }}
                                    className="ml-2 text-blue-500 hover:underline bg-transparent border-none cursor-pointer text-xs p-0"
                                >
                                    Edit
                                </button>
                            </p>
                        </>
                    ) : (
                        <div className="flex gap-3 items-center">
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder={`e.g. ${userCurrencyCode === "INR" ? "10000" : "500"}`}
                                value={budgetInput}
                                onChange={e => setBudgetInput(e.target.value)}
                                className="flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                            />
                            <button
                                onClick={handleSaveBudget}
                                disabled={savingBudget}
                                className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-sm border-none cursor-pointer hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {savingBudget ? "Saving..." : "Set Budget"}
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                    {/* Section header */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <h3 className="m-0 text-slate-900 text-xl font-bold">Transactions</h3>
                                <button
                                    onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                                    className="bg-slate-100 border-none px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    {sortOrder === "desc" ? "↓ Latest" : "↑ Oldest"}
                                </button>
                            </div>
                            {isFiltering && (
                                <button
                                    onClick={() => { setSearchQuery(""); setActiveFilter("all"); setFilterMonth(""); setFilterYear(""); }}
                                    className="text-xs text-rose-500 font-bold bg-transparent border-none cursor-pointer hover:underline"
                                >
                                    ✕ Clear filters
                                </button>
                            )}
                        </div>

                        {/* Search bar */}
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search by title, category, date or amount…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700 transition-all"
                            />
                        </div>

                        {/* Calendar date range picker */}
                        <div className="flex flex-col gap-3">
                            {/* Quick pills */}
                            <div className="flex flex-wrap items-center gap-2">
                                {["all", "weekly", "monthly"].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => { setActiveFilter(f); setFilterFrom(""); setFilterTo(""); }}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${activeFilter === f && !filterFrom && !filterTo
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300"
                                            }`}
                                    >
                                        {f === "all" ? "All Time" : f === "weekly" ? "This Week" : "This Month"}
                                    </button>
                                ))}
                                <span className="text-slate-300">|</span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Custom Range</span>
                            </div>

                            {/* Date range inputs - opens native calendar on click */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 flex flex-col gap-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">From</label>
                                    <div className={`relative flex items-center rounded-xl border-2 transition-all ${filterFrom ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}>
                                        <span className="pl-3 text-slate-400 pointer-events-none flex-shrink-0">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                        </span>
                                        <input
                                            type="date"
                                            value={filterFrom}
                                            max={filterTo || undefined}
                                            onChange={e => { setFilterFrom(e.target.value); setActiveFilter("all"); }}
                                            className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-end pb-2 text-slate-300 font-bold text-lg">→</div>
                                <div className="flex-1 flex flex-col gap-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">To</label>
                                    <div className={`relative flex items-center rounded-xl border-2 transition-all ${filterTo ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}>
                                        <span className="pl-3 text-slate-400 pointer-events-none flex-shrink-0">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                        </span>
                                        <input
                                            type="date"
                                            value={filterTo}
                                            min={filterFrom || undefined}
                                            onChange={e => { setFilterTo(e.target.value); setActiveFilter("all"); }}
                                            className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {(filterFrom || filterTo) && (
                                <p className="text-xs font-semibold text-indigo-600 pl-1 m-0">
                                    📅 {filterFrom ? new Date(filterFrom + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Any"} → {filterTo ? new Date(filterTo + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Any"}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Result count when filtering */}
                    {isFiltering && (
                        <p className="text-slate-400 text-xs font-medium mb-3">
                            {displayedTransactions.length} result{displayedTransactions.length !== 1 ? "s" : ""} found
                        </p>
                    )}

                    {/* Transaction list */}
                    <div className="flex flex-col gap-3">
                        {error ? (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm break-words">
                                <p className="font-bold mb-2">Error loading data:</p>
                                <p>{error}</p>
                            </div>
                        ) : displayedTransactions.length === 0 ? (
                            <p className="text-slate-400 text-center py-10">
                                {isFiltering ? "No transactions match your search." : "No transactions yet. Add one!"}
                            </p>
                        ) : (
                            displayedTransactions.map(tx => (
                                <div key={tx.id} className="group flex justify-between items-center p-3 md:p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100 relative">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex justify-center items-center text-xl font-bold ${tx.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {tx.amount > 0 ? '↓' : '↑'}
                                        </div>
                                        <div>
                                            <h4 className="m-0 mb-1 text-slate-900 font-semibold text-base">{tx.title}</h4>
                                            <p className="m-0 text-slate-500 text-sm">{tx.category} • {tx.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="hidden group-hover:flex items-center gap-2 mr-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/edit-expense/${tx.id}`); }}
                                                className="p-2 rounded-lg bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all"
                                                title="Edit"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(tx.id, e)}
                                                className="p-2 rounded-lg bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-red-600 hover:border-red-100 transition-all"
                                                title="Delete"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                        <span className={`font-bold text-lg ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                            {tx.amount > 0 ? '+' : '-'}{formatAmount(tx.amount)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Show more hint */}
                    {!isFiltering && filteredTransactions.length > 5 && (
                        <p className="text-center text-sm text-slate-400 mt-4 font-medium">
                            Showing 5 of {filteredTransactions.length}. Use search or filters to narrow results.
                        </p>
                    )}
                </div>

                {/* Floating Action Button */}
                <button
                    onClick={() => navigate("/add-expense")}
                    className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-16 h-16 rounded-full bg-blue-600 bg-gradient-to-br from-blue-500 to-blue-700 text-white border-none flex justify-center items-center shadow-lg shadow-blue-500/40 hover:-translate-y-1 hover:shadow-2xl transition-all cursor-pointer z-50"
                    title="Add New Transaction"
                >
                    <PlusIcon />
                </button>
            </main>
        </div>
    );
}
