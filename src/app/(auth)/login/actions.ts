"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isDemoEmail } from "@/config/demo";
import { isDemoMode } from "@/lib/env";
import { safeNextPath } from "@/lib/redirects";
import { roleHome, signupRoleFor } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/server/request";

/** Everyone signs in with an email address (owner, 31/10/2026). */
export type LoginMethod = "email";

export type SendCodeResult =
  | { ok: true; method: LoginMethod; destination: string }
  | { ok: false; error: string };

export type VerifyCodeResult = { ok: false; error: string };

const sendCodeSchema = z.object({
  method: z.literal("email"),
  value: z.string().trim().min(1).max(254),
  as: z.enum(["worker", "business"]).optional(),
  next: z.string().max(500).optional(),
});

const verifyCodeSchema = z.object({
  method: z.literal("email"),
  destination: z.string().trim().min(1).max(254),
  code: z.string().trim(),
  next: z.string().max(500).optional(),
});

function friendlyAuthError(error: AuthError): string {
  switch (error.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many codes requested. Wait a minute, then try again.";
    case "email_address_invalid":
      return "That email address doesn't look right. Check it and try again.";
    case "signup_disabled":
      return "New accounts can't be created right now. Contact us for help.";
    default:
      return "Something went wrong sending your code. Please try again.";
  }
}

/** Step 1: email a 6-digit sign-in code and link. */
export async function sendCode(
  input: z.input<typeof sendCodeSchema>,
): Promise<SendCodeResult> {
  const parsed = sendCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter your email address." };
  }
  const { method, value, as, next } = parsed.data;
  const data = { signup_role: signupRoleFor(as) };
  const supabase = await createClient();

  const email = z.email().safeParse(value.toLowerCase());
  if (!email.success) {
    return {
      ok: false,
      error: "Enter an email address, like name@example.com.",
    };
  }
  const origin = await requestOrigin();
  const confirmUrl = new URL("/auth/confirm", origin);
  if (next) confirmUrl.searchParams.set("next", safeNextPath(next, "/"));

  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      shouldCreateUser: true,
      data,
      emailRedirectTo: confirmUrl.toString(),
    },
  });
  if (error) return { ok: false, error: friendlyAuthError(error) };
  return { ok: true, method, destination: email.data };
}

/** Step 2: check the code. On success, redirects to the user's area. */
export async function verifyCode(
  input: z.input<typeof verifyCodeSchema>,
): Promise<VerifyCodeResult> {
  const parsed = verifyCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter the 6-digit code." };
  }
  const { destination, next } = parsed.data;
  const code = parsed.data.code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: destination,
    token: code,
    type: "email",
  });

  if (error || !data.user) {
    return {
      ok: false,
      error:
        "That code didn't work. It may have expired. Check it, or send a new code.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  redirect(safeNextPath(next, profile ? roleHome[profile.role] : "/"));
}

/** Demo mode only: sign in as a seeded demo account without a code. */
export async function demoSignIn(profileId: string): Promise<void> {
  if (!isDemoMode()) {
    throw new Error("Demo sign-in is turned off.");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email, role")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile || !isDemoEmail(profile.email)) {
    throw new Error("Only seeded demo accounts can be used with Sign in as.");
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email!,
  });
  if (linkError || !link.properties?.hashed_token) {
    throw new Error("Couldn't start the demo session.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: link.properties.hashed_token,
  });
  if (error) {
    throw new Error("Couldn't start the demo session.");
  }

  redirect(roleHome[profile.role]);
}
