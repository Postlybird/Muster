/**
 * The codes Supabase Auth sends on the live site (security review,
 * 03/11/2026). Supabase hands each one to our app (its send hooks) and these
 * rules decide what goes out. Its bot check covers signing in and up, but
 * not a signed-in person changing their mobile or email, so the limits are
 * here:
 *
 * - Texts only confirm a new Australian mobile: there's no sign-in by text
 *   (owner, 31/10/2026), and a person gets at most AUTH_TEXTS_PER_DAY.
 * - Emails only carry sign-in codes, with a link back to our own site.
 *   Everyone registers with their email, so the live site has no email
 *   changes, and a request for one is refused.
 */

export const AUTH_TEXTS_PER_DAY = 5;

/** A refusal, which Supabase passes on to the person as an error. */
export type HookRefusal = { ok: false; httpCode: number; message: string };

function refuse(httpCode: number, message: string): HookRefusal {
  return { ok: false, httpCode, message };
}

export type AuthTextEvent = {
  user?: { id?: string | null; phone?: string | null } | null;
  sms?: { otp?: string | null; phone?: string | null } | null;
};

export type AuthText = { ok: true; userId: string; to: string; body: string };

/** An Australian mobile, as Supabase stores it ("61412345678"), in E.164. */
export function authMobile(value: string | null | undefined): string | null {
  const digits = (value ?? "").trim().replace(/^\+/, "");
  return /^614\d{8}$/.test(digits) ? `+${digits}` : null;
}

function samePhone(a: string, b: string): boolean {
  return a.trim().replace(/^\+/, "") === b.trim().replace(/^\+/, "");
}

/**
 * What to text, if anything. `sms.phone` is the number the code is for: a
 * new number when it differs from the one on the account; the same number
 * means signing in by text.
 */
export function authTextDecision(
  event: AuthTextEvent,
  sentToday: number,
): AuthText | HookRefusal {
  const userId = event.user?.id;
  const otp = event.sms?.otp;
  if (!userId || !otp) return refuse(400, "That code request wasn't complete.");
  const target = event.sms?.phone || event.user?.phone || "";
  if (samePhone(target, event.user?.phone ?? "")) {
    return refuse(403, "Sign in with your email address instead.");
  }
  const to = authMobile(target);
  if (!to) {
    return refuse(400, "Enter an Australian mobile number, like 0412 345 678.");
  }
  if (sentToday >= AUTH_TEXTS_PER_DAY) {
    return refuse(
      429,
      "You've asked for a lot of codes today. Try again tomorrow, or contact us.",
    );
  }
  return {
    ok: true,
    userId,
    to,
    body: `Your code to confirm this mobile number is ${otp}. It expires in 15 minutes.`,
  };
}

export type AuthEmailEvent = {
  user?: { email?: string | null } | null;
  email_data?: {
    token?: string | null;
    token_hash?: string | null;
    redirect_to?: string | null;
    email_action_type?: string | null;
  } | null;
};

export type AuthEmail = { ok: true; to: string; code: string; link: string };

/** Supabase's email types that sign someone in or up. */
const SIGN_IN_ACTIONS = new Set(["signup", "magiclink", "email"]);

/** What to email, if anything. */
export function authEmailDecision(
  event: AuthEmailEvent,
  siteUrl: string,
): AuthEmail | HookRefusal {
  const data = event.email_data;
  const action = data?.email_action_type ?? "";
  if (!SIGN_IN_ACTIONS.has(action)) {
    return refuse(
      403,
      action === "email_change"
        ? "Email addresses can't be changed here. Contact us and we'll change it for you."
        : "That kind of email isn't sent here.",
    );
  }
  const to = event.user?.email;
  const code = data?.token;
  const hash = data?.token_hash;
  if (!to || !code || !hash) {
    return refuse(400, "That code request wasn't complete.");
  }
  return {
    ok: true,
    to,
    code,
    link: signInLink(data?.redirect_to, siteUrl, hash),
  };
}

function bareHost(url: URL): string {
  return url.host.replace(/^www\./, "");
}

/**
 * The emailed link: always /auth/confirm on our own site (with or without
 * www), keeping only where to go next, with the token added.
 */
export function signInLink(
  redirectTo: string | null | undefined,
  siteUrl: string,
  tokenHash: string,
): string {
  const site = new URL(siteUrl);
  let from: URL | null = null;
  try {
    from = redirectTo ? new URL(redirectTo) : null;
  } catch {
    from = null;
  }
  const ours =
    from !== null &&
    from.protocol === site.protocol &&
    bareHost(from) === bareHost(site);
  const link = new URL("/auth/confirm", ours ? from!.origin : site.origin);
  const next = ours ? from!.searchParams.get("next") : null;
  link.searchParams.set("next", next ?? "");
  link.searchParams.set("token_hash", tokenHash);
  link.searchParams.set("type", "email");
  return link.toString();
}
