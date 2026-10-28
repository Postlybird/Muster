"use server";

import { redirect } from "next/navigation";

import { brand } from "@/config/brand";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SetupResult =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; error: string };

/** Starts linking an authenticator app: returns the QR code to scan. */
export async function startAuthenticatorSetup(): Promise<SetupResult> {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if ((factors?.totp ?? []).length > 0) {
    return {
      ok: false,
      error: "You already have an authenticator app set up.",
    };
  }
  // Clear any half-finished setup, then start again.
  for (const factor of factors?.all ?? []) {
    if (factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator app",
    issuer: brand.name,
  });
  if (error || !data) {
    return { ok: false, error: "Couldn't start the setup. Please try again." };
  }
  return {
    ok: true,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/** Checks a code from the app. On success the admin area opens. */
export async function confirmAuthenticatorCode(
  factorId: string,
  code: string,
): Promise<{ ok: false; error: string }> {
  await requireRole("admin");
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) {
    return { ok: false, error: "Enter the 6-digit code from your app." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: token,
  });
  if (error) {
    return {
      ok: false,
      error:
        "That code didn't work. Use the newest code, and check your phone's clock is set automatically.",
    };
  }
  redirect("/admin");
}
