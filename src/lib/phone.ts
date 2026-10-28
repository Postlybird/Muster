/**
 * Australian phone numbers. We store E.164 (+61...) and display with spaces,
 * e.g. "+61 412 345 678" (brief §1: +61 phone numbers).
 */

function stripFormatting(input: string): string {
  return input.trim().replace(/[\s().-]/g, "");
}

/** National significant number (no leading 0 or +61), or null. */
function nationalNumber(input: string): string | null {
  const raw = stripFormatting(input);
  if (!/^\+?\d+$/.test(raw)) return null;
  if (raw.startsWith("+61")) return raw.slice(3);
  if (raw.startsWith("0061")) return raw.slice(4);
  if (raw.startsWith("61") && raw.length === 11) return raw.slice(2);
  if (raw.startsWith("0")) return raw.slice(1);
  if (raw.length === 9) return raw;
  return null;
}

/** Australian mobile (04xx xxx xxx) as E.164, or null if it isn't one. */
export function normaliseAuMobile(input: string): string | null {
  const n = nationalNumber(input);
  return n && /^4\d{8}$/.test(n) ? `+61${n}` : null;
}

/** Any Australian mobile or landline (02/03/07/08) as E.164, or null. */
export function normaliseAuPhone(input: string): string | null {
  const n = nationalNumber(input);
  return n && /^[2378]\d{8}$|^4\d{8}$/.test(n) ? `+61${n}` : null;
}

/** "+61412345678" → "+61 412 345 678"; "+61298765432" → "+61 2 9876 5432". */
export function formatAuPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const n = e164.startsWith("+61") ? e164.slice(3) : null;
  if (!n || n.length !== 9) return e164;
  if (n.startsWith("4"))
    return `+61 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  return `+61 ${n.slice(0, 1)} ${n.slice(1, 5)} ${n.slice(5)}`;
}
