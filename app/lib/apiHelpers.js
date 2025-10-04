/**
 * Helper functions for API responses
 */

/**
 * Creates a standardized JSON response with proper headers
 * @param {any} data - The data to send in the response
 * @param {number} status - The HTTP status code (default: 200)
 * @returns {Response} - A Response object with proper JSON headers
 */
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}

/**
 * Creates an error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code (default: 400)
 * @returns {Response} - A Response object with proper JSON headers
 */
export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}