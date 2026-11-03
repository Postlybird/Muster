import { describe, expect, it } from "vitest";

import { isLiveBuild, liveSetupProblems } from "./live-setup";

const READY = {
  NEXT_PUBLIC_SUPABASE_URL: "https://live.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk",
  SUPABASE_SECRET_KEY: "sk",
  NEXT_PUBLIC_SITE_URL: "https://www.example.com",
  CRON_SECRET: "cron",
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "re_key",
  EMAIL_FROM: "Us <hello@example.com>",
  SMS_PROVIDER: "twilio",
  TWILIO_ACCOUNT_SID: "AC1",
  TWILIO_AUTH_TOKEN: "token",
  TWILIO_MESSAGING_SERVICE_SID: "MG1",
  GEOCODER_PROVIDER: "google",
  GOOGLE_MAPS_API_KEY: "maps",
  PUSH_PROVIDER: "webpush",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
  VAPID_PRIVATE_KEY: "private",
  ABN_LOOKUP_GUID: "guid",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site",
  AUTH_HOOK_SECRET: "hook",
};

describe("liveSetupProblems", () => {
  it("is happy with everything real", () => {
    expect(liveSetupProblems(READY)).toEqual([]);
  });

  it("refuses pretend email, texts, address search and notifications", () => {
    const problems = liveSetupProblems({
      ...READY,
      EMAIL_PROVIDER: "mock",
      SMS_PROVIDER: undefined,
      GEOCODER_PROVIDER: "mock",
      PUSH_PROVIDER: "mock",
    });
    expect(problems).toEqual([
      "EMAIL_PROVIDER=resend (real emails)",
      "SMS_PROVIDER=twilio (real texts)",
      "GEOCODER_PROVIDER=google (address search across Australia)",
      "PUSH_PROVIDER=webpush (app notifications)",
    ]);
  });

  it("names each missing key, and wants the live address over https", () => {
    const problems = liveSetupProblems({
      ...READY,
      TWILIO_AUTH_TOKEN: " ",
      ABN_LOOKUP_GUID: "",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined,
      NEXT_PUBLIC_SITE_URL: "http://www.example.com",
    });
    expect(problems).toEqual([
      "NEXT_PUBLIC_SITE_URL (the live address, starting https://)",
      "TWILIO_AUTH_TOKEN (real texts)",
      "ABN_LOOKUP_GUID (checking businesses' ABNs)",
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY (the bot check on sign-in)",
    ]);
  });
});

describe("isLiveBuild", () => {
  it("is only Vercel's production build outside demo mode", () => {
    expect(isLiveBuild({ VERCEL_ENV: "production" })).toBe(true);
    expect(isLiveBuild({ VERCEL_ENV: "production", DEMO_MODE: "true" })).toBe(
      false,
    );
    expect(isLiveBuild({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isLiveBuild({ DEMO_MODE: "false" })).toBe(false);
  });
});
