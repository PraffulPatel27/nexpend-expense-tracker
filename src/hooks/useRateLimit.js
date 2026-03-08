import { useState, useEffect } from 'react';

/**
 * Custom hook to limit function calls (e.g., login attempts)
 * Limits to 5 attempts per 1 minute window.
 * Persists across page reloads using localStorage.
 */
export function useRateLimit(key = "nexpend_login_attempts", maxAttempts = 5, lockDurationMs = 60000) {
    const [isLocked, setIsLocked] = useState(false);
    const [lockTimeRemaining, setLockTimeRemaining] = useState(0);

    useEffect(() => {
        const checkLock = () => {
            const data = JSON.parse(localStorage.getItem(key) || '{"attempts": [], "lockedUntil": 0}');
            const now = Date.now();

            if (data.lockedUntil > now) {
                setIsLocked(true);
                setLockTimeRemaining(Math.ceil((data.lockedUntil - now) / 1000));
            } else {
                if (isLocked) {
                    setIsLocked(false);
                    setLockTimeRemaining(0);
                }
            }
        };

        // Initial check
        checkLock();

        // Check every second to update countdown
        const interval = setInterval(checkLock, 1000);
        return () => clearInterval(interval);
    }, [key, isLocked]);

    const recordAttempt = () => {
        const now = Date.now();
        let data = JSON.parse(localStorage.getItem(key) || '{"attempts": [], "lockedUntil": 0}');

        // Remove attempts older than the window (lockDurationMs)
        data.attempts = data.attempts.filter(time => time > now - lockDurationMs);
        data.attempts.push(now);

        if (data.attempts.length >= maxAttempts) {
            data.lockedUntil = now + lockDurationMs;
            setIsLocked(true);
            setLockTimeRemaining(Math.ceil(lockDurationMs / 1000));
        }

        localStorage.setItem(key, JSON.stringify(data));
        return data.attempts.length >= maxAttempts;
    };

    const resetAttempts = () => {
        localStorage.removeItem(key);
        setIsLocked(false);
        setLockTimeRemaining(0);
    };

    return { isLocked, lockTimeRemaining, recordAttempt, resetAttempts };
}
