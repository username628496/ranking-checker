/**
 * Type-safe error handling utilities
 * Provides consistent error handling across the application
 */

import { AxiosError } from "axios";

/**
 * Standard error response from backend
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

/**
 * Typed error result
 */
export interface ErrorResult {
  message: string;
  code?: string;
  statusCode?: number;
  originalError?: unknown;
}

/**
 * Type guard to check if error is an Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === "object" &&
    error !== null &&
    "isAxiosError" in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Type guard to check if error is a standard Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if error response matches ApiErrorResponse
 */
export function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as ApiErrorResponse).error === "string"
  );
}

/**
 * Extract user-friendly error message from any error type
 *
 * @param error - Error of any type (AxiosError, Error, string, etc.)
 * @param fallbackMessage - Default message if error cannot be parsed
 * @returns User-friendly error message
 *
 * @example
 * try {
 *   await axios.post('/api/endpoint', data);
 * } catch (err) {
 *   const message = getErrorMessage(err, 'Failed to save data');
 *   notifications.show({ message, color: 'red' });
 * }
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage = "An unexpected error occurred"
): string {
  // Handle Axios errors
  if (isAxiosError(error)) {
    // Check for API error response format
    if (error.response?.data && isApiErrorResponse(error.response.data)) {
      return error.response.data.error;
    }

    // Check for generic message
    if (error.response?.data && typeof error.response.data === "object") {
      const data = error.response.data as Record<string, unknown>;
      if (data.message && typeof data.message === "string") {
        return data.message;
      }
    }

    // HTTP status-based messages
    if (error.response?.status) {
      switch (error.response.status) {
        case 400:
          return "Invalid request. Please check your input.";
        case 401:
          return "Unauthorized. Please check your credentials.";
        case 403:
          return "Access forbidden.";
        case 404:
          return "Resource not found.";
        case 429:
          return "Too many requests. Please try again later.";
        case 500:
          return "Server error. Please try again later.";
        case 503:
          return "Service unavailable. Please try again later.";
      }
    }

    // Network errors
    if (error.code === "ERR_NETWORK") {
      return "Network error. Please check your internet connection.";
    }

    if (error.code === "ECONNABORTED") {
      return "Request timeout. Please try again.";
    }

    // Generic Axios error message
    if (error.message) {
      return error.message;
    }
  }

  // Handle standard Error objects
  if (isError(error)) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  // Handle object with message property
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  // Fallback
  return fallbackMessage;
}

/**
 * Extract detailed error information for logging/debugging
 *
 * @param error - Error of any type
 * @returns Structured error information
 *
 * @example
 * try {
 *   await axios.post('/api/endpoint', data);
 * } catch (err) {
 *   const errorInfo = getErrorDetails(err);
 *   console.error('API Error:', errorInfo);
 * }
 */
export function getErrorDetails(error: unknown): ErrorResult {
  const result: ErrorResult = {
    message: getErrorMessage(error),
    originalError: error,
  };

  // Extract Axios-specific details
  if (isAxiosError(error)) {
    result.statusCode = error.response?.status;
    result.code = error.code;

    if (error.response?.data && isApiErrorResponse(error.response.data)) {
      result.message = error.response.data.error;
    }
  }

  // Extract standard Error details
  if (isError(error)) {
    result.code = error.name;
  }

  return result;
}

/**
 * Type-safe wrapper for async operations with error handling
 *
 * @param fn - Async function to execute
 * @param errorMessage - Custom error message for failures
 * @returns Tuple of [data, error]
 *
 * @example
 * const [data, error] = await safeAsync(
 *   () => axios.get('/api/data'),
 *   'Failed to load data'
 * );
 *
 * if (error) {
 *   notifications.show({ message: error, color: 'red' });
 *   return;
 * }
 *
 * // Use data safely
 * console.log(data);
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<[T | null, string | null]> {
  try {
    const data = await fn();
    return [data, null];
  } catch (error) {
    const message = getErrorMessage(error, errorMessage);
    return [null, message];
  }
}

/**
 * Validate that a value is not null or undefined
 * Useful for runtime type checking
 *
 * @param value - Value to check
 * @param errorMessage - Error message if value is invalid
 * @throws Error if value is null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  errorMessage = "Value is required"
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(errorMessage);
  }
}

/**
 * Create a typed error object
 *
 * @param message - Error message
 * @param code - Optional error code
 * @param statusCode - Optional HTTP status code
 * @returns ErrorResult object
 */
export function createError(
  message: string,
  code?: string,
  statusCode?: number
): ErrorResult {
  return {
    message,
    code,
    statusCode,
  };
}
