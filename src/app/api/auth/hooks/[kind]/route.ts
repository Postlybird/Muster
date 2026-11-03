import { NextResponse } from "next/server";

import type { AuthEmailEvent, AuthTextEvent } from "@/domain/auth-messages";
import { verifyWebhook, webhookKey } from "@/lib/webhook-signature";
import {
  sendAuthEmail,
  sendAuthText,
  type HookResult,
} from "@/server/auth-hooks";

/**
 * Supabase Auth's send hooks on the live site (deploy/shifta-live): every
 * code it texts or emails comes here, signed with AUTH_HOOK_SECRET, and
 * goes out only if the rules allow (src/domain/auth-messages.ts). A
 * refusal goes back as a hook error, which Supabase passes on to the
 * person. Sites without the secret (the demo) refuse every call.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/auth/hooks/[kind]">,
) {
  const { kind } = await params;
  if (kind !== "sms" && kind !== "email") {
    return new Response("Not found.", { status: 404 });
  }
  const secret = process.env.AUTH_HOOK_SECRET;
  if (!secret) {
    return new Response("Sign-in hooks aren't set up on this site.", {
      status: 503,
    });
  }
  const body = await request.text();
  if (!verifyWebhook(body, request.headers, webhookKey(secret))) {
    return new Response("That request wasn't signed by Supabase.", {
      status: 401,
    });
  }
  let event: unknown;
  try {
    event = JSON.parse(body);
  } catch {
    event = null;
  }
  if (typeof event !== "object" || event === null) {
    return new Response("That request wasn't a hook event.", { status: 400 });
  }

  try {
    const result =
      kind === "sms"
        ? await sendAuthText(event as AuthTextEvent)
        : await sendAuthEmail(
            event as AuthEmailEvent,
            process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin,
          );
    return reply(result);
  } catch (problem) {
    console.error(`The ${kind} hook couldn't send a code`, problem);
    return reply({
      ok: false,
      httpCode: 500,
      message:
        kind === "sms"
          ? "We couldn't send a text just now. Please try again in a minute."
          : "We couldn't send an email just now. Please try again in a minute.",
    });
  }
}

/** Supabase's hook reply: {} when sent, or the error to pass on. */
function reply(result: HookResult) {
  return NextResponse.json(
    result.ok
      ? {}
      : { error: { http_code: result.httpCode, message: result.message } },
  );
}
