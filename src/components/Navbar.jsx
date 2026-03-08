import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Icons 
const HomeIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
const UserIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
const LogoutIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
const ChartIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
const ShieldIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>

const Navbar = () => {
    const { currentUser, userData, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!currentUser) return null;

    const navItems = [
        { path: "/", icon: <HomeIcon />, label: "Home", color: "text-blue-600", bg: "bg-blue-50" },
        { path: "/analytics", icon: <ChartIcon />, label: "Analytics", color: "text-indigo-600", bg: "bg-indigo-50" },
        ...(userData?.role === "admin" ? [{ path: "/admin", icon: <ShieldIcon />, label: "Admin", color: "text-purple-600", bg: "bg-purple-50" }] : []),
        { path: "/profile", icon: <UserIcon />, label: "Profile", color: "text-blue-600", bg: "bg-blue-50" },
    ];

    const isActive = (path) => location.pathname === path;

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    return (
        <div className="bg-slate-50 px-4 pt-4 md:px-6 md:pt-6 flex justify-center w-full">
            <nav className="w-full max-w-6xl bg-white flex justify-between items-center p-4 md:px-8 md:py-4 rounded-2xl shadow-sm border border-slate-100">
                {/* Logo & Branding */}
                <div
                    onClick={() => navigate("/")}
                    className="text-2xl font-extrabold text-slate-900 tracking-tight cursor-pointer"
                >
                    Nexpend.
                </div>

                {/* Nav Links */}
                <div className="flex items-center gap-1 md:gap-4">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 border-none cursor-pointer ${isActive(item.path)
                                ? `${item.color} ${item.bg} font-bold`
                                : "text-slate-400 bg-transparent hover:text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            <span>{item.icon}</span>
                            {isActive(item.path) && (
                                <span className="text-xs font-bold whitespace-nowrap overflow-hidden transition-all duration-300">
                                    {item.label}
                                </span>
                            )}
                        </button>
                    ))}

                    <button
                        onClick={handleLogout}
                        className="p-2 md:p-3 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-300 bg-transparent border-none cursor-pointer"
                        title="Logout"
                    >
                        <LogoutIcon />
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default Navbar;
