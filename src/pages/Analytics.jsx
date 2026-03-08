import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserExpenses } from "../firebase/expenseService";
import { formatCurrency } from "../utils/currencyFormatter";
import {
    Chart as ChartJS,
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    RadialLinearScale,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { Doughnut, Bar, Line, Radar, Pie } from "react-chartjs-2";

ChartJS.register(
    ArcElement, BarElement, CategoryScale, LinearScale,
    PointElement, LineElement, RadialLinearScale,
    Tooltip, Legend, Filler
);

// ── Palette ───────────────────────────────────────────────────────────────────
const PALETTE = [
    "#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4",
    "#84cc16", "#a855f7"
];

// ── Icon helpers ──────────────────────────────────────────────────────────────
const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);
const ChartViewerIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
);

// ── Chart type definitions ────────────────────────────────────────────────────
const CHART_TYPES = [
    { id: "bar", label: "Bar", icon: "📊" },
    { id: "line", label: "Line", icon: "📈" },
    { id: "area", label: "Area", icon: "🌊" },
    { id: "hbar", label: "Horizontal", icon: "📉" },
    { id: "doughnut", label: "Doughnut", icon: "🍩" },
    { id: "pie", label: "Pie", icon: "🥧" },
    { id: "radar", label: "Radar", icon: "🕸️" },
];

// ── Data sources the user can pick ────────────────────────────────────────────
const DATA_SOURCES = [
    { id: "monthly", label: "Monthly Spending" },
    { id: "category", label: "Category Spending" },
];

export default function Analytics() {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Custom viewer state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [activeChart, setActiveChart] = useState("bar");
    const [activeSource, setActiveSource] = useState("monthly");

    useEffect(() => {
        if (!currentUser) return;
        getUserExpenses(currentUser.uid)
            .then(data => { setTransactions(data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
    }, [currentUser]);

    const currencyCode = userData?.currency || "USD";
    const fmt = (n) => formatCurrency(Math.abs(n), currencyCode);

    // ── Derived data ─────────────────────────────────────────────────────────
    const expenses = transactions.filter(tx => tx.amount < 0);

    const categoryMap = {};
    expenses.forEach(tx => {
        const cat = tx.category || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(Number(tx.amount));
    });
    const categoryLabels = Object.keys(categoryMap);
    const categoryValues = Object.values(categoryMap);

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
        };
    });
    const monthlyTotals = months.map(m =>
        expenses.filter(tx => tx.date?.startsWith(m.key))
            .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0)
    );

    // ── Insight values ───────────────────────────────────────────────────────
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const totalThisMonth = expenses
        .filter(tx => tx.date?.startsWith(currentYM))
        .reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0);
    const mostSpentCategory = categoryLabels.length
        ? categoryLabels[categoryValues.indexOf(Math.max(...categoryValues))] : "—";
    const mostSpentAmount = categoryValues.length ? Math.max(...categoryValues) : 0;
    const topTransaction = expenses.length
        ? expenses.reduce((a, b) => Math.abs(Number(a.amount)) > Math.abs(Number(b.amount)) ? a : b) : null;
    const avgMonthly = monthlyTotals.filter(v => v > 0).length
        ? monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.filter(v => v > 0).length : 0;

    // ── Static chart configs (for the two fixed charts) ──────────────────────
    const doughnutData = {
        labels: categoryLabels,
        datasets: [{
            data: categoryValues,
            backgroundColor: PALETTE.slice(0, categoryLabels.length),
            borderWidth: 2, borderColor: "#f8fafc", hoverOffset: 8,
        }],
    };
    const doughnutOptions = {
        responsive: true, cutout: "65%",
        plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, padding: 16, font: { size: 13, weight: "600" } } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${fmt(ctx.raw)}` } },
        },
    };

    const barData = {
        labels: months.map(m => m.label),
        datasets: [{
            label: "Expenses", data: monthlyTotals,
            backgroundColor: "#6366f1", borderRadius: 10, borderSkipped: false,
            hoverBackgroundColor: "#4f46e5",
        }],
    };
    const barOptions = {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${fmt(ctx.raw)}` } } },
        scales: {
            x: { grid: { display: false }, ticks: { font: { weight: "600" } } },
            y: { grid: { color: "#f1f5f9" }, ticks: { callback: (v) => fmt(v), font: { size: 11 } } },
        },
    };

    // ── Custom viewer data builder ────────────────────────────────────────────
    const isMonthlySource = activeSource === "monthly";
    const viewerLabels = isMonthlySource ? months.map(m => m.label) : categoryLabels;
    const viewerValues = isMonthlySource ? monthlyTotals : categoryValues;
    const viewerColors = isMonthlySource
        ? Array(6).fill(null).map((_, i) => PALETTE[i % PALETTE.length])
        : PALETTE.slice(0, categoryLabels.length);

    const viewerDataset = {
        label: isMonthlySource ? "Monthly Expenses" : "Category Expenses",
        data: viewerValues,
        backgroundColor: viewerColors.map(c => c + "cc"),
        borderColor: viewerColors,
        borderWidth: 2,
        borderRadius: ["bar", "hbar"].includes(activeChart) ? 8 : undefined,
        fill: activeChart === "area",
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: "#ffffff",
        pointBorderWidth: 2,
        hoverOffset: 10,
    };

    const customData = { labels: viewerLabels, datasets: [viewerDataset] };

    const sharedScaleOpts = {
        x: { grid: { display: false }, ticks: { font: { weight: "600" } } },
        y: { grid: { color: "#f1f5f9" }, ticks: { callback: (v) => fmt(v), font: { size: 11 } } },
    };

    const customOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: ["doughnut", "pie", "radar"].includes(activeChart),
                position: "bottom",
                labels: { usePointStyle: true, padding: 14, font: { size: 12, weight: "600" } },
            },
            tooltip: { callbacks: { label: (ctx) => ` ${isMonthlySource ? ctx.label + ": " : ""}${fmt(ctx.raw)}` } },
        },
        scales: ["doughnut", "pie"].includes(activeChart)
            ? {}
            : activeChart === "hbar"
                ? { x: sharedScaleOpts.y, y: sharedScaleOpts.x }
                : activeChart === "radar"
                    ? {}
                    : sharedScaleOpts,
        ...(activeChart === "doughnut" ? { cutout: "60%" } : {}),
        ...(activeChart === "hbar" ? { indexAxis: "y" } : {}),
    };

    const renderCustomChart = () => {
        if (viewerValues.length === 0) return <p className="text-slate-400 text-center py-16">No data available.</p>;
        switch (activeChart) {
            case "doughnut": return <div className="max-w-sm mx-auto"><Doughnut data={customData} options={customOptions} /></div>;
            case "pie": return <div className="max-w-sm mx-auto"><Pie data={customData} options={customOptions} /></div>;
            case "radar": return <div className="max-w-md mx-auto"><Radar data={customData} options={customOptions} /></div>;
            case "line":
            case "area": return <Line data={customData} options={customOptions} />;
            case "hbar": return <Bar data={customData} options={customOptions} />;
            default: return <Bar data={customData} options={customOptions} />;
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen text-slate-500 text-lg">Loading Analytics...</div>
    );

    return (
        <div className="min-h-[calc(100vh-80px)] bg-slate-50 font-sans p-4 md:p-6 pb-24">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-8">
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 bg-transparent border-none cursor-pointer mb-6 font-medium"
                >
                    <BackIcon /> Back to Dashboard
                </button>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight m-0">Analytics</h1>
                        <p className="text-slate-500 mt-1 m-0">An overview of your spending patterns</p>
                    </div>
                    {/* Custom Analytics Viewer Toggle Button */}
                    <button
                        onClick={() => setViewerOpen(v => !v)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border-2 transition-all cursor-pointer ${viewerOpen
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200"
                            : "bg-white text-indigo-600 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50"
                            }`}
                    >
                        <ChartViewerIcon /> Custom Analytics Viewer
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto flex flex-col gap-6">

                {/* ── Custom Analytics Viewer Panel ─────────────────────────── */}
                {viewerOpen && (
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border-2 border-indigo-100">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                            <h2 className="text-lg font-bold text-slate-900 m-0">Custom Analytics Viewer</h2>
                            {/* Data source selector */}
                            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                                {DATA_SOURCES.map(src => (
                                    <button
                                        key={src.id}
                                        onClick={() => setActiveSource(src.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${activeSource === src.id
                                            ? "bg-white text-indigo-600 shadow-sm"
                                            : "bg-transparent text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        {src.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Chart type selector pills */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {CHART_TYPES.map(ct => (
                                <button
                                    key={ct.id}
                                    onClick={() => setActiveChart(ct.id)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2 cursor-pointer transition-all ${activeChart === ct.id
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                        }`}
                                >
                                    <span>{ct.icon}</span> {ct.label}
                                </button>
                            ))}
                        </div>

                        {/* Chart canvas */}
                        <div className="min-h-64">
                            {renderCustomChart()}
                        </div>

                        <p className="text-slate-400 text-xs mt-4 text-center m-0">
                            Showing <strong>{DATA_SOURCES.find(s => s.id === activeSource)?.label}</strong> as a <strong>{CHART_TYPES.find(c => c.id === activeChart)?.label} Chart</strong>
                        </p>
                    </div>
                )}

                {/* ── Insights Panel ─────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "This Month", value: fmt(totalThisMonth), accent: "text-rose-500", bg: "bg-rose-50" },
                        { label: "Most Spent Category", value: mostSpentCategory, sub: fmt(mostSpentAmount), accent: "text-indigo-600", bg: "bg-indigo-50" },
                        { label: "Top Transaction", value: topTransaction ? topTransaction.title : "—", sub: topTransaction ? fmt(topTransaction.amount) : "", accent: "text-amber-600", bg: "bg-amber-50" },
                        { label: "Avg Monthly", value: fmt(avgMonthly), accent: "text-emerald-600", bg: "bg-emerald-50" },
                    ].map((item, i) => (
                        <div key={i} className={`${item.bg} rounded-2xl p-5 flex flex-col gap-1`}>
                            <p className="m-0 text-xs font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                            <p className={`m-0 text-xl font-bold ${item.accent} truncate`}>{item.value}</p>
                            {item.sub && <p className="m-0 text-sm text-slate-500 font-medium">{item.sub}</p>}
                        </div>
                    ))}
                </div>

                {/* ── Default Charts Row ─────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Doughnut */}
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900 m-0 mb-6">Spending by Category</h2>
                        {categoryLabels.length > 0 ? (
                            <div className="flex justify-center">
                                <div className="w-full max-w-xs md:max-w-sm">
                                    <Doughnut data={doughnutData} options={doughnutOptions} />
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-center py-12">No expense data yet.</p>
                        )}
                    </div>

                    {/* Bar */}
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900 m-0 mb-6">Monthly Spending (Last 6 Months)</h2>
                        {monthlyTotals.some(v => v > 0) ? (
                            <Bar data={barData} options={barOptions} />
                        ) : (
                            <p className="text-slate-400 text-center py-12">No expense data yet.</p>
                        )}
                    </div>
                </div>

                {/* ── Category Breakdown ─────────────────────────────────────── */}
                {categoryLabels.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900 m-0 mb-6">Category Breakdown</h2>
                        <div className="flex flex-col gap-3">
                            {categoryLabels
                                .map((cat, i) => ({ cat, amount: categoryValues[i], color: PALETTE[i % PALETTE.length] }))
                                .sort((a, b) => b.amount - a.amount)
                                .map(({ cat, amount, color }) => {
                                    const pct = Math.round((amount / categoryValues.reduce((a, b) => a + b, 0)) * 100);
                                    return (
                                        <div key={cat} className="flex items-center gap-4">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-semibold text-slate-700">{cat}</span>
                                                    <span className="text-sm font-bold text-slate-900">{fmt(amount)}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="h-1.5 rounded-full transition-all duration-700"
                                                        style={{ width: `${pct}%`, background: color }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 w-10 text-right">{pct}%</span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
