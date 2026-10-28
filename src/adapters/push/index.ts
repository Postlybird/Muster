import "server-only";

import { providerFor } from "../provider";
import { MockPushSender } from "./mock";
import type { PushSender } from "./types";

export type { PushNotification, PushSender } from "./types";

export function getPushSender(): PushSender {
  providerFor("PUSH_PROVIDER", ["mock"]);
  return new MockPushSender();
}
