/**
 * Live currency exchange rate service using the free Frankfurter API.
 * https://api.frankfurter.app — No API key needed, CORS-friendly.
 *
 * Caches rates for 1 hour to avoid hammering the API.
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = {}; // { baseCurrency: { timestamp, rates } }

/**
 * Fetches live exchange rates for a given base currency.
 * Returns an object like: { USD: 1, EUR: 0.92, INR: 83.5, ... }
 */
export async function fetchRates(baseCurrency = "USD") {
    const base = baseCurrency.toUpperCase();
    const cached = cache[base];

    // Return cached rates if still fresh
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.rates;
    }

    try {
        const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Frankfurter doesn't include the base itself — add it
        const rates = { ...data.rates, [base]: 1 };

        cache[base] = { timestamp: Date.now(), rates };
        return rates;
    } catch (err) {
        console.warn("Exchange rate fetch failed:", err.message);
        // Return empty so callers can fallback to no conversion
        return { [base]: 1 };
    }
}

/**
 * Converts an amount from one currency to another using live rates.
 * Falls back to 1:1 if rates are unavailable.
 */
export async function convertAmount(amount, fromCurrency, toCurrency) {
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return amount;

    const rates = await fetchRates(fromCurrency);
    const rate = rates[toCurrency.toUpperCase()] ?? 1;
    return amount * rate;
}
