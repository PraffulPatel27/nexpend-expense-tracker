import { useState, useEffect, useCallback, useRef } from "react";
import { fetchRates } from "../services/exchangeRateService";

/**
 * useExchangeRate hook
 *
 * Provides a synchronous `convert(amount)` function that converts from
 * `fromCurrency` to `toCurrency` using live exchange rates.
 *
 * @param {string} fromCurrency - The "stored" currency (e.g. "INR")
 * @param {string} toCurrency   - The display currency the user selected
 */
export function useExchangeRate(fromCurrency, toCurrency) {
    const [exchangeRate, setExchangeRate] = useState(1);
    const [rateLoading, setRateLoading] = useState(false);
    const [rateError, setRateError] = useState(null);
    const abortRef = useRef(false);

    useEffect(() => {
        if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) {
            setExchangeRate(1);
            setRateError(null);
            return;
        }

        abortRef.current = false;
        setRateLoading(true);
        setRateError(null);

        fetchRates(fromCurrency).then(rates => {
            if (abortRef.current) return;
            const rate = rates[toCurrency.toUpperCase()] ?? 1;
            setExchangeRate(rate);
            setRateLoading(false);
        }).catch(err => {
            if (abortRef.current) return;
            console.warn("Rate fetch error:", err);
            setExchangeRate(1);
            setRateError("Could not load live rates. Showing original values.");
            setRateLoading(false);
        });

        return () => { abortRef.current = true; };
    }, [fromCurrency, toCurrency]);

    // Synchronous conversion using the cached rate
    const convert = useCallback((amount) => {
        return Number(amount) * exchangeRate;
    }, [exchangeRate]);

    return { convert, exchangeRate, rateLoading, rateError };
}
