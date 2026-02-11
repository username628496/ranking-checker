/**
 * Centralized API configuration
 */

/**
 * Base URL for API requests
 * - Production: https://ranking.aeseo1.org/api
 * - Development: http://localhost:8001/api
 */
export const API_BASE = import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD
    ? "https://ranking.aeseo1.org/api"
    : "http://localhost:8001/api"
  );

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Streaming
  STREAM_SAVE: `${API_BASE}/stream/save`,
  STREAM: `${API_BASE}/stream`,

  // Bulk check
  BULK_CHECK: `${API_BASE}/bulk/check`,

  // Templates
  TEMPLATES: `${API_BASE}/templates`,
  TEMPLATE_BY_ID: (id: number) => `${API_BASE}/templates/${id}`,

  // History
  HISTORY_ALL: `${API_BASE}/history/all`,
  HISTORY_DAILY: `${API_BASE}/history/daily`,
  HISTORY_SESSIONS: `${API_BASE}/history/sessions`,

  // Settings
  TEST_SERPER: `${API_BASE}/test/serper`,
  VALIDATE_API_KEY: `${API_BASE}/validate-api-key`, // TODO: Create this endpoint

  // Health
  HEALTH: `${API_BASE.replace('/api', '')}/health`,
} as const;

export default API_BASE;
