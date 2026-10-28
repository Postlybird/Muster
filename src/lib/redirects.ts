/**
 * Returns `next` only if it's a same-site path, so sign-in links can't be
 * used to send people to another website.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback: string,
): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
