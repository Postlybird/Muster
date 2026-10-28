import "server-only";

import { providerFor } from "../provider";
import { MockSmsSender } from "./mock";
import type { SmsSender } from "./types";

export type { SmsMessage, SmsSender } from "./types";

export function getSmsSender(): SmsSender {
  providerFor("SMS_PROVIDER", ["mock"]);
  return new MockSmsSender();
}
