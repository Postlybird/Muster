/**
 * Reading list filters from a page's address (`?status=active&page=2`),
 * so filtered lists can be bookmarked and shared.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

/** A value from the address, trimmed; "" when it's missing or repeated. */
export function textParam(params: SearchParams, key: string): string {
  const raw = params[key];
  return typeof raw === "string" ? raw.trim() : "";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A record id from the address, or undefined if it isn't one. */
export function idParam(params: SearchParams, key: string): string | undefined {
  const value = textParam(params, key);
  return UUID.test(value) ? value : undefined;
}

/** One of the allowed values, or undefined. */
export function choiceParam<T extends string>(
  params: SearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = textParam(params, key);
  return allowed.find((choice) => choice === value);
}

/** Which page of a list, counting from 1. */
export function pageParam(params: SearchParams): number {
  const page = Number(textParam(params, "page"));
  return Number.isInteger(page) && page > 1 ? page : 1;
}

/**
 * The address of the same list with some values changed: null or "" drops
 * one. Any change other than the page goes back to the first page.
 */
export function listHref(
  path: string,
  params: SearchParams,
  changes: Record<string, string | number | null>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value !== "") query.set(key, value);
  }
  if (!("page" in changes)) query.delete("page");
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") query.delete(key);
    else query.set(key, String(value));
  }
  if (query.get("page") === "1") query.delete("page");
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}
