import "server-only";

import { writeToOutbox } from "../outbox";
import type { PushNotification, PushSender, PushTarget } from "./types";

export class MockPushSender implements PushSender {
  readonly name = "mock";

  async send(target: PushTarget, notification: PushNotification) {
    return writeToOutbox({
      channel: "push",
      recipient: notification.recipient,
      subject: notification.title,
      body: notification.body,
      meta: { url: notification.url, endpoint: target.endpoint },
    });
  }
}
