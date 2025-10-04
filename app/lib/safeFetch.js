// Lightweight safeFetch helper: attempts to parse JSON only when Content-Type is application/json
export async function safeFetch(input, init) {
  const res = await fetch(input, init);

  const contentType = res.headers.get('content-type') || '';

  // If response is JSON, parse and return
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try {
      return await res.json();
    } catch (err) {
      // JSON parse error despite header - throw with status and body text for debugging
      const text = await res.text().catch(() => '<unreadable body>');
      const error = new Error(`Failed to parse JSON response: ${err.message}`);
      error.status = res.status;
      error.body = text;
      throw error;
    }
  }

  // For non-JSON responses, return text and include status for callers to decide
  const text = await res.text();
  const error = new Error('Expected JSON but received non-JSON response');
  error.status = res.status;
  error.body = text;
  throw error;
}
