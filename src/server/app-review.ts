import "server-only";

import { timingSafeEqual } from "node:crypto";

import { QUICK_START_STEPS } from "@/domain/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * The app stores' reviewers sign in with a fixed code (owner, 14/11/2026),
 * the one exception to "no passwords". It works only for one account, named
 * by APP_REVIEW_EMAIL with its 6-digit APP_REVIEW_CODE (the live site's
 * settings, never the code), and only while an admin has switched "Let the
 * app stores' reviewers sign in" on. Ten wrong codes since it was switched
 * on switch it off. The account is a worker we haven't checked, so reviewers
 * can look around but can't apply for shifts or see any business's details.
 */

const SETTING = "app_review_sign_in";
/** Wrong codes, since review sign-in was switched on, that switch it off. */
export const MAX_WRONG_CODES = 10;

type ReviewAccount = { email: string; code: string };

/** The reviewers' account, or null when it isn't set up. */
export function reviewAccount(): ReviewAccount | null {
  const email = process.env.APP_REVIEW_EMAIL?.trim().toLowerCase();
  const code = process.env.APP_REVIEW_CODE?.trim();
  if (!email || !code || !/^\d{6}$/.test(code)) return null;
  return { email, code };
}

/** When review sign-in was switched on, or null while it's off. */
async function switchedOnAt(
  admin: ReturnType<typeof createAdminClient>,
): Promise<string | null> {
  const { data } = await admin
    .from("settings")
    .select("value, updated_at")
    .eq("key", SETTING)
    .maybeSingle();
  return data?.value === true ? data.updated_at : null;
}

/** Whether this email gets the reviewers' sign-in right now. */
export async function isReviewSignIn(email: string): Promise<boolean> {
  const account = reviewAccount();
  if (!account || email.trim().toLowerCase() !== account.email) return false;
  return (await switchedOnAt(createAdminClient())) !== null;
}

function sameCode(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Checks a code typed for the reviewers' account. "not_review" means it's
 * someone else (or review sign-in is off), so the usual emailed code applies.
 */
export async function reviewSignIn(
  email: string,
  code: string,
): Promise<"not_review" | "signed_in" | "wrong"> {
  const account = reviewAccount();
  if (!account || email.trim().toLowerCase() !== account.email) {
    return "not_review";
  }
  const admin = createAdminClient();
  const since = await switchedOnAt(admin);
  if (!since) return "not_review";

  if (!sameCode(code, account.code)) {
    await admin.from("app_review_sign_ins").insert({ ok: false });
    const { count } = await admin
      .from("app_review_sign_ins")
      .select("id", { count: "exact", head: true })
      .eq("ok", false)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_WRONG_CODES) {
      await admin
        .from("settings")
        .update({ value: false, updated_by: null })
        .eq("key", SETTING);
    }
    return "wrong";
  }

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: account.email,
  });
  if (error || !link.properties?.hashed_token) return "wrong";
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: link.properties.hashed_token,
  });
  if (signInError) return "wrong";
  await admin.from("app_review_sign_ins").insert({ ok: true });
  return "signed_in";
}

/** Somewhere in Sydney with work nearby, for the shifts near them. */
const REVIEW_HOME = {
  home_suburb: "Parramatta",
  home_postcode: "2150",
  home_state: "NSW",
  home_lat: -33.815,
  home_lng: 151.0011,
  travel_radius_km: 30,
};
/**
 * A Sydney landline from the range the regulator keeps for examples: nobody
 * gets texts, and no demo worker shares it (the example mobiles all have
 * one each).
 */
const REVIEW_MOBILE = "+61255509999";
const ANY_TIME = { start_time: "00:00", end_time: "23:59" };

/**
 * Gets the reviewers' account ready when review sign-in is switched on: made
 * if it's new, opened again if a reviewer deleted it, and through the quick
 * sign-up (suburb, distance, every work type, any time), so reviewers land on
 * the home screen with shifts near them. It stays unchecked.
 */
export async function prepareReviewAccount(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const account = reviewAccount();
  if (!account) {
    return {
      ok: false,
      error:
        "The reviewers' account isn't set up yet: it needs APP_REVIEW_EMAIL and a 6-digit APP_REVIEW_CODE in the hosting settings.",
    };
  }
  const admin = createAdminClient();

  let { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("email", account.email)
    .maybeSingle();
  if (!profile) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: account.email,
      email_confirm: true,
      user_metadata: { signup_role: "worker" },
    });
    if (error || !created.user) {
      return { ok: false, error: "Couldn't make the reviewers' account." };
    }
    ({ data: profile } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", created.user.id)
      .maybeSingle());
  }
  if (!profile || profile.role !== "worker") {
    return {
      ok: false,
      error:
        "APP_REVIEW_EMAIL belongs to an account that isn't a worker. Choose another email for the reviewers.",
    };
  }

  // A reviewer may have tried Delete my account last time.
  await admin.auth.admin.updateUserById(profile.id, { ban_duration: "none" });
  await admin
    .from("profiles")
    .update({
      full_name: "App Reviewer",
      phone: REVIEW_MOBILE,
      closed_at: null,
      archived_at: null,
    })
    .eq("id", profile.id);

  const { data: worker } = await admin
    .from("workers")
    .select("id, status, onboarding_steps")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!worker)
    return { ok: false, error: "Couldn't find the reviewers' worker." };
  await admin
    .from("workers")
    .update({
      ...REVIEW_HOME,
      legal_first_name: "App",
      legal_last_name: "Reviewer",
      archived_at: null,
      status:
        worker.status === "offboarded" || worker.status === "active"
          ? "draft"
          : worker.status,
      status_reason: null,
      onboarding_steps: [
        ...new Set([...worker.onboarding_steps, ...QUICK_START_STEPS]),
      ],
    })
    .eq("id", worker.id);

  const { data: categories } = await admin
    .from("categories")
    .select("id")
    .eq("active", true)
    .is("archived_at", null);
  if (categories && categories.length > 0) {
    await admin.from("worker_categories").upsert(
      categories.map((category) => ({
        worker_id: worker.id,
        category_id: category.id,
      })),
      { onConflict: "worker_id,category_id", ignoreDuplicates: true },
    );
  }
  await admin.from("availability_weekly").upsert(
    [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      worker_id: worker.id,
      weekday,
      ...ANY_TIME,
    })),
    { onConflict: "worker_id,weekday" },
  );
  return { ok: true };
}
