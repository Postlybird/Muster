import { describe, expect, it } from "vitest";

import {
  supabaseHookSecret,
  verifyWebhook,
  webhookKey,
  webhookSignature,
} from "./webhook-signature";

const key = webhookKey("a long random string from a password manager");
const body = '{"user":{"id":"u1"},"sms":{"otp":"123456"}}';
const now = 1_793_000_000_000;
const timestamp = String(now / 1000);

function headers(values: Record<string, string>) {
  return new Headers(values);
}

function signed(overrides: Record<string, string> = {}) {
  return headers({
    "webhook-id": "msg_1",
    "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${webhookSignature(key, "msg_1", timestamp, body)}`,
    ...overrides,
  });
}

describe("signed hook requests", () => {
  it("are accepted when signed with our key just now", () => {
    expect(verifyWebhook(body, signed(), key, now)).toBe(true);
    // Supabase can send more than one signature, separated by spaces.
    expect(
      verifyWebhook(
        body,
        signed({
          "webhook-signature": `v1,bm90IGl0 v1,${webhookSignature(key, "msg_1", timestamp, body)}`,
        }),
        key,
        now,
      ),
    ).toBe(true);
  });

  it("are refused if anything's changed or missing", () => {
    expect(verifyWebhook(`${body} `, signed(), key, now)).toBe(false);
    expect(verifyWebhook(body, signed(), webhookKey("another"), now)).toBe(
      false,
    );
    expect(
      verifyWebhook(body, signed({ "webhook-id": "msg_2" }), key, now),
    ).toBe(false);
    expect(
      verifyWebhook(body, signed({ "webhook-signature": "v2,abc" }), key, now),
    ).toBe(false);
    expect(verifyWebhook(body, headers({}), key, now)).toBe(false);
  });

  it("are refused when old", () => {
    expect(verifyWebhook(body, signed(), key, now + 6 * 60_000)).toBe(false);
    expect(verifyWebhook(body, signed(), key, now - 6 * 60_000)).toBe(false);
    expect(verifyWebhook(body, signed(), key, now + 4 * 60_000)).toBe(true);
  });

  it("use a key that fits Supabase's settings, however long the secret", () => {
    for (const secret of ["short", "x".repeat(200)]) {
      expect(supabaseHookSecret(secret)).toMatch(
        /^v1,whsec_[A-Za-z0-9+/=]{32,88}$/,
      );
    }
  });
});
