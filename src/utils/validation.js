/**
 * Validates a password against strong security rules.
 * 
 * Rules:
 * - At least 8 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 * - Contains at least one special character
 * 
 * @param {string} password - The password to validate
 * @returns {string|null} Error message if invalid, null if valid
 */
export function validatePassword(password) {
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*()[\]{}|<>?~_+\-=\\\/;:'",.`]/.test(password)) return "Password must contain at least one special character.";

    return null; // Valid
}

/**
 * Validates if an email belongs to a trusted domain list to prevent spam signups.
 * 
 * @param {string} email - The email to check
 * @returns {boolean} True if domain is trusted.
 */
export function isTrustedEmailDomain(email) {
    if (!email || !email.includes("@")) return false;
    const domain = email.split("@")[1].toLowerCase();

    // Add or remove trusted domains as needed
    const trustedDomains = ["gmail.com", "yahoo.com", "outlook.com", "test.com", "nexpend.com", "hotmail.com"];
    return trustedDomains.includes(domain);
}
