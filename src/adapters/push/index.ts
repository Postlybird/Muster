import "server-only";

import { providerFor } from "../provider";
import { MockPushSender } from "./mock";
import type { PushSender } from "./types";
import { WebPushSender } from "./web-push";

export type { PushNotification, PushSender, PushTarget } from "./types";

export function getPushSender(): PushSender {
  return providerFor("PUSH_PROVIDER", ["mock", "webpush"]) === "webpush"
    ? new WebPushSender()
    : new MockPushSender();
}

/** The key browsers need to subscribe, when real push is set up. */
export function pushPublicKey(): string | null {
  return providerFor("PUSH_PROVIDER", ["mock", "webpush"]) === "webpush"
    ? (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null)
    : null;
}
