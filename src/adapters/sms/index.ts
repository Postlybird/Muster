import "server-only";

import { isLiveBuild } from "@/lib/live-setup";

import { providerFor } from "../provider";
import { MockSmsSender } from "./mock";
import { TwilioSmsSender } from "./twilio";
import type { SmsSender } from "./types";

export type { SmsMessage, SmsSender } from "./types";

/**
 * The text sender, or null while texts are off. Texts are only for
 * call-outs, and the live site sends none until Twilio is set up
 * (SMS_PROVIDER=twilio; owner, 16/11/2026). The demo, tests and local runs
 * text through the mock, which writes to the outbox; the live site never
 * uses it.
 */
export function getSmsSender(): SmsSender | null {
  if (providerFor("SMS_PROVIDER", ["mock", "twilio"]) === "twilio") {
    return new TwilioSmsSender();
  }
  return isLiveBuild(process.env) ? null : new MockSmsSender();
}

/** Whether we send texts at all (see getSmsSender()). */
export function textsEnabled(): boolean {
  return getSmsSender() !== null;
}
