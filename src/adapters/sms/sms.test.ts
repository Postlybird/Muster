import { afterEach, describe, expect, it, vi } from "vitest";

import { textsEnabled } from "./index";

describe("textsEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off on the live site until Twilio is set up (owner, 16/11/2026)", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("SMS_PROVIDER", "");
    expect(textsEnabled()).toBe(false);
  });

  it("is on in the demo, which texts to the outbox", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("SMS_PROVIDER", "");
    expect(textsEnabled()).toBe(true);
  });

  it("is on once Twilio is set up", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("SMS_PROVIDER", "twilio");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC1");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token");
    vi.stubEnv("TWILIO_MESSAGING_SERVICE_SID", "MG1");
    expect(textsEnabled()).toBe(true);
  });
});
