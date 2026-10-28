/**
 * fetch for Supabase clients on the server. Next.js memoises identical GET
 * requests within one render, so re-reading a row after changing it would
 * return the old answer. A new AbortController signal opts each request
 * out (see "Memoization" in the Next.js fetch docs), and no-store skips
 * any caching: our data is per-person and must always be current.
 */
export function freshFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    cache: "no-store",
    signal: init?.signal ?? new AbortController().signal,
  });
}
