/**
 * Extracts a user-friendly error message from a Firebase error
 * Maps common authentication and database errors to actionable, human-readable text.
 * 
 * @param {Error|string} error - The error object or string
 * @returns {string} Clean, user-friendly error message
 */
export function getFriendlyErrorMessage(error) {
    if (!error) return "An unknown error occurred.";

    // Get string representation
    let msg = typeof error === 'string' ? error : (error.message || String(error));

    // Define specific friendly overrides for common Firebase error codes
    const errorMappings = {
        'auth/invalid-email': "The email address is not valid",
        'auth/user-disabled': "Your account has been disabled. Please contact support",
        'auth/user-not-found': "We couldn't find an account with that email",
        'auth/wrong-password': "The password you entered is incorrect",
        'auth/invalid-credential': "The email or password you entered is incorrect",
        'auth/email-already-in-use': "An account already exists with this email address",
        'auth/weak-password': "Your password is too weak. It must be at least 6 characters long",
        'auth/network-request-failed': "Network error. Please check your internet connection and try again",
        'auth/too-many-requests': "Too many failed login attempts",
        'auth/missing-password': "Please enter a password",
        'auth/missing-email': "Please enter an email address",
        'auth/requires-recent-login': "For security reasons, please log out and log back"
    };

    // Check if the original message contains any of the known error codes
    for (const [code, friendlyMessage] of Object.entries(errorMappings)) {
        if (msg.includes(code)) {
            return friendlyMessage;
        }
    }

    // Default cleanup if no specific mapping matched
    // Remove "Firebase:" prefix
    msg = msg.replace(/Firebase:\s*/i, "");

    // Remove error codes like (auth/user-not-found) or (database/xyz)
    msg = msg.replace(/\s*\([^)]+\)\.?/g, "");

    // Capitalize first letter if it exists
    if (msg.length > 0) {
        msg = msg.charAt(0).toUpperCase() + msg.slice(1);
    }

    // Ensure it ends with a period if it doesn't already
    if (msg.length > 0 && !msg.endsWith('.') && !msg.endsWith('!') && !msg.endsWith('?')) {
        msg += ".";
    }

    return msg.trim();
}
