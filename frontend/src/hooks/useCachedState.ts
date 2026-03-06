/**
 * React Hook for cached state with TTL
 *
 * Similar to useState but persists to localStorage with automatic expiration
 */
import { useState, useEffect, useCallback } from 'react';
import { cacheGet, cacheSet, cacheRemove, CacheTTL } from '@/utils/cacheStorage';

/**
 * Custom hook for state with TTL-based localStorage caching
 *
 * @param key - Storage key
 * @param initialValue - Initial value if cache is empty or expired
 * @param ttl - Time to live in milliseconds (default: 1 hour)
 * @returns [value, setValue, removeValue]
 *
 * @example
 * ```tsx
 * // Cache form input for 5 minutes
 * const [keywords, setKeywords, clearKeywords] = useCachedState(
 *   'form_keywords',
 *   '',
 *   CacheTTL.SHORT
 * );
 *
 * // Cache API response for 1 hour
 * const [results, setResults] = useCachedState(
 *   'bulk_results',
 *   [],
 *   CacheTTL.MEDIUM
 * );
 *
 * // Cache user preferences indefinitely
 * const [preferences, setPreferences] = useCachedState(
 *   'user_prefs',
 *   defaultPrefs,
 *   CacheTTL.FOREVER
 * );
 * ```
 */
export function useCachedState<T>(
  key: string,
  initialValue: T,
  ttl: number = CacheTTL.MEDIUM
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize state from cache or use initial value
  const [state, setState] = useState<T>(() => {
    const cached = cacheGet<T>(key);
    return cached !== null ? cached : initialValue;
  });

  // Update cache whenever state changes
  useEffect(() => {
    cacheSet(key, state, ttl);
  }, [key, state, ttl]);

  // Setter function that supports both value and updater function
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        return newValue;
      });
    },
    []
  );

  // Remove function to clear cache and reset to initial value
  const removeValue = useCallback(() => {
    cacheRemove(key);
    setState(initialValue);
  }, [key, initialValue]);

  return [state, setValue, removeValue];
}

/**
 * Hook for caching form state with automatic expiration
 *
 * @param formKey - Unique key for the form
 * @param initialState - Initial form state
 * @param ttl - Time to live (default: 5 minutes for form inputs)
 * @returns [state, updateField, resetForm]
 *
 * @example
 * ```tsx
 * const [formData, updateField, resetForm] = useCachedForm('bulk_form', {
 *   keywords: '',
 *   location: 'vn',
 *   device: 'desktop'
 * });
 *
 * // Update single field
 * updateField('keywords', 'new value');
 *
 * // Update multiple fields
 * updateField({ keywords: 'value1', location: 'hanoi' });
 *
 * // Reset to initial state
 * resetForm();
 * ```
 */
export function useCachedForm<T extends Record<string, any>>(
  formKey: string,
  initialState: T,
  ttl: number = CacheTTL.SHORT
): [
  T,
  <K extends keyof T>(field: K, value: T[K]) => void | ((updates: Partial<T>) => void),
  () => void
] {
  const [state, setState, removeState] = useCachedState(formKey, initialState, ttl);

  // Update single field or multiple fields
  const updateField = useCallback(
    <K extends keyof T>(fieldOrUpdates: K | Partial<T>, value?: T[K]) => {
      if (typeof fieldOrUpdates === 'object') {
        // Update multiple fields
        setState((prev) => ({ ...prev, ...fieldOrUpdates }));
      } else {
        // Update single field
        setState((prev) => ({ ...prev, [fieldOrUpdates]: value }));
      }
    },
    [setState]
  );

  return [state, updateField as any, removeState];
}

/**
 * Hook for caching API responses with expiration
 *
 * @param cacheKey - Unique cache key
 * @param fetcher - Async function to fetch data
 * @param ttl - Cache duration (default: 1 hour)
 * @returns { data, loading, error, refetch }
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useCachedQuery(
 *   'templates_list',
 *   () => axios.get('/api/templates'),
 *   CacheTTL.MEDIUM
 * );
 * ```
 */
export function useCachedQuery<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useCachedState<T | null>(cacheKey, null, ttl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // If we have cached data, return it immediately
    if (data !== null) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [data, fetcher, setData]);

  // Fetch on mount if no cached data
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch function (ignores cache)
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetcher, setData]);

  return { data, loading, error, refetch };
}
