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
  if (error?.code === "user_banned") {
    redirect("/account-closed");
  }
  if (error || !data.user) {
    redirect("/login?error=link");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, closed_at")
    .eq("id", data.user.id)
    .single();
  // Deleted accounts stay out, even if blocking sign-in didn't take.
  if (profile?.closed_at) {
    await supabase.auth.signOut();
    redirect("/account-closed");
  }

  redirect(
    safeNextPath(
      typeof next === "string" ? next : null,
      profile ? roleHome[profile.role] : "/",
    ),
  );
}
