import "server-only";

import { providerFor } from "../provider";
import { MockSmsSender } from "./mock";
import { TwilioSmsSender } from "./twilio";
import type { SmsSender } from "./types";

export type { SmsMessage, SmsSender } from "./types";

export function getSmsSender(): SmsSender {
  return providerFor("SMS_PROVIDER", ["mock", "twilio"]) === "twilio"
    ? new TwilioSmsSender()
    : new MockSmsSender();
}
