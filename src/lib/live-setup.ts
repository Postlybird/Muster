/**
 * What the live site needs before it can run (owner, 03/11/2026: it won't
 * start if any email, text or address search would still be pretend).
 * next.config.ts checks it when Vercel builds the live site, outside demo
 * mode: a deployment with something missing fails, and the last good one
 * stays up. Each entry says what to set, and what it's for.
 */
export function liveSetupProblems(
  env: Record<string, string | undefined>,
): string[] {
  const problems: string[] = [];
  const value = (name: string) => env[name]?.trim() ?? "";
  const need = (name: string, why: string) => {
    if (!value(name)) problems.push(`${name} (${why})`);
  };
  const provider = (name: string, real: string, why: string) => {
    if ((value(name) || "mock") !== real)
      problems.push(`${name}=${real} (${why})`);
  };

  need("NEXT_PUBLIC_SUPABASE_URL", "the live database");
  need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "the live database");
  need("SUPABASE_SECRET_KEY", "the live database");
  if (!value("NEXT_PUBLIC_SITE_URL").startsWith("https://")) {
    problems.push("NEXT_PUBLIC_SITE_URL (the live address, starting https://)");
  }
  need("CRON_SECRET", "the scheduled jobs");

  provider("EMAIL_PROVIDER", "resend", "real emails");
  need("RESEND_API_KEY", "real emails");
  need("EMAIL_FROM", "real emails");

  provider("SMS_PROVIDER", "twilio", "real texts");
  need("TWILIO_ACCOUNT_SID", "real texts");
  need("TWILIO_AUTH_TOKEN", "real texts");
  need("TWILIO_MESSAGING_SERVICE_SID", "real texts");

  provider("GEOCODER_PROVIDER", "google", "address search across Australia");
  need("GOOGLE_MAPS_API_KEY", "address search across Australia");

  // Pretend app notifications would count as delivered, so nobody would
  // get a text instead.
  provider("PUSH_PROVIDER", "webpush", "app notifications");
  need("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "app notifications");
  need("VAPID_PRIVATE_KEY", "app notifications");

  // The pretend lookup only knows the demo's ABNs.
  need("ABN_LOOKUP_GUID", "checking businesses' ABNs");
  // The live sign-in settings refuse code requests without the bot check.
  need("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "the bot check on sign-in");
  // Supabase hands every sign-in code to the app, signed with this.
  need("AUTH_HOOK_SECRET", "sending sign-in codes");
  return problems;
}

/** Whether this build is the live site's: Vercel production, outside demo mode. */
export function isLiveBuild(env: Record<string, string | undefined>): boolean {
  return env.VERCEL_ENV === "production" && env.DEMO_MODE !== "true";
}
