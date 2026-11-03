import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed requests the Standard Webhooks way, which Supabase Auth uses to
 * call its send hooks: the "webhook-signature" header holds
 * "v1,<base64 HMAC-SHA256>" of "<webhook-id>.<webhook-timestamp>.<body>",
 * made with a shared key, and the timestamp must be recent.
 *
 * Our key is the SHA-256 of the AUTH_HOOK_SECRET string (any long random
 * string), so whatever its length, it fits Supabase's settings as
 * supabaseHookSecret() writes it. The live workflow does the same in bash.
 */

export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

/** The signing key for a secret string. */
export function webhookKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

/** The secret as Supabase's hook settings take it: "v1,whsec_<base64 key>". */
export function supabaseHookSecret(secret: string): string {
  return `v1,whsec_${webhookKey(secret).toString("base64")}`;
}

/** The signature for a request body (base64), as Supabase makes it. */
export function webhookSignature(
  key: Buffer,
  id: string,
  timestamp: string,
  body: string,
): string {
  return createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
}

/** True when the request was signed with the key in the last five minutes. */
export function verifyWebhook(
  body: string,
  headers: Pick<Headers, "get">,
  key: Buffer,
  nowMs: number = Date.now(),
): boolean {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !signatures || !/^\d{1,12}$/.test(timestamp)) {
    return false;
  }
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }
  const expected = Buffer.from(
    webhookSignature(key, id, timestamp, body),
    "base64",
  );
  return signatures.split(" ").some((entry) => {
    const [version, signature] = entry.split(",", 2);
    if (version !== "v1" || !signature) return false;
    const given = Buffer.from(signature, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
