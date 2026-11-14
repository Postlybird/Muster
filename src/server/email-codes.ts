import "server-only";

import type { AuthError } from "@supabase/supabase-js";
import { z } from "zod";

import { safeNextPath } from "@/lib/redirects";
import { createClient } from "@/lib/supabase/server";

import { CLOSED_ACCOUNT_MESSAGE } from "./accounts";
import { requestOrigin } from "./request";

/**
 * Signing in and registering both work by email (owner, 31/10/2026): we
 * email a 6-digit code and a link, and there's no password. New accounts are
 * made on the first code; `data` becomes the new account's details (role,
 * name, and what a business gave us), and is ignored for someone who already
 * has an account.
 */
export type EmailCodeResult =
  { ok: true; destination: string } | { ok: false; error: string };

export function friendlyAuthError(error: AuthError): string {
  switch (error.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many codes requested. Wait a minute, then try again.";
    case "email_address_invalid":
      return "That email address doesn't look right. Check it and try again.";
    case "captcha_failed":
      return "We couldn't check the request came from a person. Wait a moment, then try again.";
    case "signup_disabled":
      return "New accounts can't be created right now. Contact us for help.";
    case "user_banned":
      return CLOSED_ACCOUNT_MESSAGE;
    default:
      return "Something went wrong sending your code. Please try again.";
  }
}

/** The email address, cleaned up, or null if it isn't one. */
export function cleanEmail(value: string): string | null {
  const email = z.email().safeParse(value.trim().toLowerCase());
  return email.success ? email.data : null;
}

export async function sendEmailCode({
  email,
  data,
  next,
  captchaToken,
}: {
  email: string;
  data: Record<string, string>;
  next?: string;
  /** The bot check's token, on the live site (src/components/forms/bot-check.tsx). */
  captchaToken?: string;
}): Promise<EmailCodeResult> {
  const supabase = await createClient();
  // The link always carries a query, so the live site's sign-in email
  // (deploy/shifta-live/supabase/templates) can add the token with "&".
  const confirmUrl = new URL("/auth/confirm", await requestOrigin());
  confirmUrl.searchParams.set("next", next ? safeNextPath(next, "/") : "");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data,
      emailRedirectTo: confirmUrl.toString(),
      ...(captchaToken === undefined ? {} : { captchaToken }),
    },
  });
  if (error) return { ok: false, error: friendlyAuthError(error) };
  return { ok: true, destination: email };
}
