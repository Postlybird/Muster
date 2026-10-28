"use server";

import type { AuthError } from "@supabase/supabase-js";
import { z } from "zod";

import { normaliseAuMobile } from "@/lib/phone";
import { failure, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/server/request";
import { finishStep, getMyWorker } from "@/server/workers";

export type ContactKind = "phone" | "email";

export type SendResult =
  { ok: true; destination: string } | { ok: false; error: string };

function friendly(error: AuthError, kind: ContactKind): string {
  switch (error.code) {
    case "phone_exists":
      return "That number is already used by another account. Use a different number, or contact us if it's yours.";
    case "email_exists":
      return "That email address is already used by another account. Use a different one, or contact us if it's yours.";
    case "over_sms_send_rate_limit":
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many codes requested. Wait a minute, then try again.";
    case "email_address_invalid":
      return "That email address doesn't look right. Check it and try again.";
    case "sms_send_failed":
      return "We couldn't send a text to that number. Check it and try again.";
    default:
      return kind === "phone"
        ? "We couldn't send a code to that number. Please try again."
        : "We couldn't send a code to that address. Please try again.";
  }
}

/**
 * Adds the contact method the worker didn't sign up with. The code goes to
 * the new number or address; nothing changes until it's confirmed.
 */
export async function sendContactCode(
  kind: ContactKind,
  value: string,
): Promise<SendResult> {
  const { user } = await getMyWorker();
  if ((kind === "phone" && user.phone) || (kind === "email" && user.email)) {
    return { ok: false, error: "You've already confirmed this." };
  }
  const supabase = await createClient();

  if (kind === "phone") {
    const phone = normaliseAuMobile(value);
    if (!phone) {
      return {
        ok: false,
        error: "Enter an Australian mobile number, like 0412 345 678.",
      };
    }
    const { error } = await supabase.auth.updateUser({ phone });
    if (error) return { ok: false, error: friendly(error, kind) };
    return { ok: true, destination: phone };
  }

  const email = z.email().safeParse(value.trim().toLowerCase());
  if (!email.success) {
    return {
      ok: false,
      error: "Enter an email address, like name@example.com.",
    };
  }
  const confirmUrl = new URL("/auth/confirm", await requestOrigin());
  confirmUrl.searchParams.set("next", "/worker/onboarding/contact");
  const { error } = await supabase.auth.updateUser(
    { email: email.data },
    { emailRedirectTo: confirmUrl.toString() },
  );
  if (error) return { ok: false, error: friendly(error, kind) };
  return { ok: true, destination: email.data };
}

/** Confirms the code, then carries on with onboarding. */
export async function confirmContactCode(
  kind: ContactKind,
  destination: string,
  code: string,
): Promise<ActionState> {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return failure("Enter the 6-digit code.");

  const { worker } = await getMyWorker();
  const supabase = await createClient();
  const { error } =
    kind === "phone"
      ? await supabase.auth.verifyOtp({
          phone: destination,
          token,
          type: "phone_change",
        })
      : await supabase.auth.verifyOtp({
          email: destination,
          token,
          type: "email_change",
        });
  if (error) {
    return failure(
      "That code didn't work. It may have expired. Check it, or send a new code.",
    );
  }
  return finishStep(worker, "contact");
}

/** Both contact methods are already confirmed: just move on. */
export async function continueFromContact(): Promise<ActionState> {
  const { user, worker } = await getMyWorker();
  if (!user.phone || !user.email) {
    return failure("Add and confirm your mobile number and email address.");
  }
  return finishStep(worker, "contact");
}
