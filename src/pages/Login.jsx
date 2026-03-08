import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { getFriendlyErrorMessage } from "../utils/errorHandler";
import { useRateLimit } from "../hooks/useRateLimit";
import FullScreenLoader from "../components/FullScreenLoader";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState(""); // For success messages
    const [loading, setLoading] = useState(false);
    const [isResetMode, setIsResetMode] = useState(false); // Toggle between Login and Reset

    const { login, loginWithGoogle, resetPassword } = useAuth();
    const navigate = useNavigate();
    const { isLocked, lockTimeRemaining, recordAttempt, resetAttempts } = useRateLimit("login_attempts", 5, 60000);

    async function handleSubmit(e) {
        e.preventDefault();

        if (isLocked) {
            return setError(`Too many login attempts. Please try again in ${lockTimeRemaining} seconds.`);
        }

        const gotLocked = recordAttempt();
        if (gotLocked) {
            return setError(`Too many login attempts. Please try again in 60 seconds.`);
        }

        try {
            setError("");
            setLoading(true);
            await login(email, password);
            resetAttempts();
            navigate("/"); // Redirect to dashboard on success
        } catch (err) {
            setError("Failed to sign in: " + getFriendlyErrorMessage(err));
        }

        setLoading(false);
    }

    async function handleResetPassword(e) {
        e.preventDefault();

        if (isLocked) {
            return setError(`Too many attempts. Please try again in ${lockTimeRemaining} seconds.`);
        }

        const gotLocked = recordAttempt();
        if (gotLocked) {
            return setError(`Too many attempts. Please try again in 60 seconds.`);
        }

        try {
            setMessage("");
            setError("");
            setLoading(true);
            await resetPassword(email);
            setMessage("Password reset email sent! Check your inbox.");
            resetAttempts();
            setTimeout(() => setIsResetMode(false), 3000); // Switch back to login after 3s
        } catch (err) {
            setError("Failed to reset password: " + getFriendlyErrorMessage(err));
        }

        setLoading(false);
    }

    async function handleGoogleSignIn() {
        if (isLocked) {
            return setError(`Too many login attempts. Please try again in ${lockTimeRemaining} seconds.`);
        }

        const gotLocked = recordAttempt();
        if (gotLocked) {
            return setError(`Too many login attempts. Please try again in 60 seconds.`);
        }

        try {
            setError("");
            setLoading(true);
            await loginWithGoogle();
            resetAttempts();
            navigate("/");
        } catch (err) {
            setError("Failed to sign in with Google: " + getFriendlyErrorMessage(err));
        }
        setLoading(false);
    }

    return (
        <div className="flex justify-center items-center min-h-screen bg-slate-50 p-4">
            {loading && <FullScreenLoader message={isResetMode ? "Sending reset email..." : "Signing in..."} />}
            <div className="w-full max-w-md p-6 sm:p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
                <h2 className="text-center mb-8 text-3xl font-bold text-slate-800 tracking-tight">
                    {isResetMode ? "Reset Password" : "Log In"}
                </h2>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-center text-sm font-medium border border-red-100">{error}</div>}
                {message && <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-6 text-center text-sm font-medium border border-green-100">{message}</div>}

                <form onSubmit={isResetMode ? handleResetPassword : handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="font-semibold text-slate-700 text-sm">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    {!isResetMode && (
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <label className="font-semibold text-slate-700 text-sm">Password</label>
                                <button type="button" onClick={() => { setIsResetMode(true); setError(""); setMessage(""); }} className="text-xs text-blue-600 hover:text-blue-800 font-semibold focus:outline-none">
                                    Forgot Password?
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3.5 pr-12 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                />
                                {password.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                                    >
                                        {showPassword ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <button disabled={loading || isLocked} type="submit" className="mt-2 p-3.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors disabled:opacity-50">
                        {isLocked ? `Try again in ${lockTimeRemaining}s` : (isResetMode ? "Send Reset Email" : "Log In")}
                    </button>

                    {isResetMode && (
                        <button type="button" onClick={() => { setIsResetMode(false); setError(""); setMessage(""); }} className="p-2 text-sm text-slate-600 font-semibold hover:text-slate-800 transition-colors bg-slate-100 rounded-xl">
                            Back to Login
                        </button>
                    )}
                </form>

                <div className="text-center my-6 text-slate-400 text-sm font-medium relative flex items-center justify-center">
                    <span className="bg-white px-3 relative z-10">or</span>
                    <div className="absolute w-full h-px bg-slate-200 top-1/2 left-0 -translate-y-1/2"></div>
                </div>

                <button
                    disabled={loading || isLocked}
                    onClick={handleGoogleSignIn}
                    className="w-full p-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign in with Google
                </button>

                <div className="mt-8 text-center text-slate-600 text-sm">
                    Need an account? <Link to="/signup" className="text-blue-600 font-bold hover:text-blue-700 hover:underline">Sign Up</Link>
                </div>
            </div>
        </div>
    );
}


