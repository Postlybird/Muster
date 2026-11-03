import "server-only";

import { getEmailSender } from "@/adapters/email";
import { getSmsSender } from "@/adapters/sms";
import {
  authEmailDecision,
  authTextDecision,
  type AuthEmailEvent,
  type AuthTextEvent,
  type HookRefusal,
} from "@/domain/auth-messages";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The live site's send hooks (security review, 03/11/2026): Supabase Auth
 * hands each code to /api/auth/hooks/<kind>, signed with AUTH_HOOK_SECRET,
 * and these send what the rules in src/domain/auth-messages.ts allow, with
 * fixed wording (sign-in codes aren't admin-editable templates). Counting a
 * person's code texts needs the service role. The demo keeps its own hooks,
 * which write codes to the outbox (deploy/muster-dev).
 */

export type HookResult = { ok: true } | HookRefusal;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Texts a code to confirm a new mobile, at most a few a day per person. */
export async function sendAuthText(event: AuthTextEvent): Promise<HookResult> {
  const admin = createAdminClient();
  const userId = event.user?.id;
  let sentToday = 0;
  if (userId) {
    const { count, error } = await admin
      .from("auth_texts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("sent_at", new Date(Date.now() - DAY_MS).toISOString());
    if (error) throw new Error(`Couldn't count code texts: ${error.message}`);
    sentToday = count ?? 0;
  }
  const decision = authTextDecision(event, sentToday);
  if (!decision.ok) return decision;

  // Counted before it goes, so two requests at once can't both slip under
  // the limit; a text that fails isn't counted.
  const { data: claim, error } = await admin
    .from("auth_texts")
    .insert({ user_id: decision.userId })
    .select("id")
    .single();
  if (error) throw new Error(`Couldn't record the code text: ${error.message}`);
  try {
    await getSmsSender().send({ to: decision.to, body: decision.body });
  } catch (problem) {
    await admin.from("auth_texts").delete().eq("id", claim.id);
    throw problem;
  }
  await admin
    .from("auth_texts")
    .delete()
    .eq("user_id", decision.userId)
    .lt("sent_at", new Date(Date.now() - 2 * DAY_MS).toISOString());
  return { ok: true };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Emails a sign-in code, with a link to sign in instead. */
export async function sendAuthEmail(
  event: AuthEmailEvent,
  siteUrl: string,
): Promise<HookResult> {
  const decision = authEmailDecision(event, siteUrl);
  if (!decision.ok) return decision;
  const { code, link } = decision;
  await getEmailSender().send({
    to: decision.to,
    subject: "Your sign-in code",
    text: `Your sign-in code is ${code}. It expires in 15 minutes.\n\nOr sign in with this link: ${link}\n\nIf you didn't ask for this code, you can ignore this email.`,
    html: `<p>Your sign-in code is <strong style="font-size: 20px; letter-spacing: 2px">${escapeHtml(code)}</strong>. It expires in 15 minutes.</p><p>Or <a href="${escapeHtml(link)}">sign in with this link</a>.</p><p>If you didn't ask for this code, you can ignore this email.</p>`,
    tag: "sign_in_code",
  });
  return { ok: true };
}
