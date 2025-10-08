/**
 * Fetch with automatic timeout
 * Prevents hanging requests from degrading UX
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number; // Timeout in milliseconds (default: 30000ms / 30s)
}

/**
 * Wrapper around fetch() that adds timeout functionality
 *
 * @param url - The URL to fetch
 * @param options - Fetch options including optional timeout
 * @returns Promise<Response>
 * @throws Error if request times out or fails
 *
 * @example
 * ```ts
 * const response = await fetchWithTimeout('https://api.example.com/data', {
 *   method: 'POST',
 *   timeout: 10000, // 10 second timeout
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(data)
 * });
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  // Create an AbortController to cancel the request
  const controller = new AbortController();
  const signal = controller.signal;

  // Set timeout to abort the request
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal
    });

    // Clear timeout if request completes successfully
    clearTimeout(timeoutId);

    return response;
  } catch (error: any) {
    // Clear timeout
    clearTimeout(timeoutId);

    // Handle abort error
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Convenience method for GET requests with timeout
 */
export async function getWithTimeout(
  url: string,
  timeout = 30000
): Promise<Response> {
  return fetchWithTimeout(url, { method: 'GET', timeout });
}

/**
 * Convenience method for POST requests with timeout
 */
export async function postWithTimeout(
  url: string,
  data: any,
  timeout = 30000
): Promise<Response> {
  return fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    timeout
  });
}

export default fetchWithTimeout;
