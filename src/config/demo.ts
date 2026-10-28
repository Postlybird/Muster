/**
 * Seeded demo accounts use this email domain (.test is reserved, so these
 * addresses can never belong to a real person). "Sign in as" only works for
 * these accounts, and only in demo mode.
 */
export const DEMO_EMAIL_DOMAIN = "demo.test";

export function isDemoEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}
