/**
 * Environment access. NEXT_PUBLIC_* values must be referenced literally so
 * Next.js can inline them into browser bundles.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl() {
    return required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get supabasePublishableKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  },
};

/**
 * Demo mode turns on the on-screen outbox and "Sign in as" for seeded demo
 * users. It must be off in production.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}
