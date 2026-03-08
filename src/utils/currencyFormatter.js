export const CURRENCIES = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
];

/**
 * Formats a number into a localized currency string
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - e.g., 'USD', 'INR'
 * @returns string
 */
export function formatCurrency(amount, currencyCode = "USD") {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
        }).format(amount);
    } catch (e) {
        // Fallback if currency code is invalid for some reason
        console.warn(`Invalid currency code: ${currencyCode}. Falling back to USD.`);
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }
}
