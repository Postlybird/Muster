"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/redirects";
import { roleHome } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

import { isEmailOtpType } from "./otp-types";

/** Uses the one-time link token. Only runs when the person presses the button. */
export async function confirmSignIn(formData: FormData): Promise<void> {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "");
  const next = formData.get("next");

  if (!tokenHash || !isEmailOtpType(type)) {
    redirect("/login?error=link");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });
  if (error || !data.user) {
    redirect("/login?error=link");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  redirect(
    safeNextPath(
      typeof next === "string" ? next : null,
      profile ? roleHome[profile.role] : "/",
    ),
  );
}
