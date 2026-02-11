/**
 * Custom hook for persisting state to localStorage
 *
 * Usage:
 *   const [value, setValue] = useLocalStorage('key', defaultValue);
 */
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

/**
 * Hook for persisting multiple related state values as a single object
 *
 * Usage:
 *   const { state, setState, clearState } = usePersistedState('session-key', {
 *     keywords: '',
 *     results: []
 *   });
 */
export function usePersistedState<T extends Record<string, any>>(
  key: string,
  initialState: T
) {
  // Load initial state from localStorage
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialState;
      const parsed = JSON.parse(item);
      return { ...initialState, ...parsed };
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialState;
    }
  });

  // Auto-save to localStorage when state changes
  useEffect(() => {
    try {
      // Check if state has meaningful data (not just initial empty state)
      // For our use case: only save if 'results' array has items
      const results = state.results;
      const hasData = Array.isArray(results) && results.length > 0;

      if (hasData) {
        window.localStorage.setItem(key, JSON.stringify(state));
      } else {
        // If no data, remove from localStorage to keep it clean
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, state]);

  const clearState = () => {
    try {
      window.localStorage.removeItem(key);
      setState(initialState);
    } catch (error) {
      console.error(`Error clearing localStorage key "${key}":`, error);
    }
  };

  const updateState = (updates: Partial<T> | ((prevState: T) => T)) => {
    setState((prev) => {
      if (typeof updates === 'function') {
        return updates(prev);
      }
      return { ...prev, ...updates };
    });
  };

  return { state, setState: updateState, clearState };
}
