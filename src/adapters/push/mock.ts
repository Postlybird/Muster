import "server-only";

import { writeToOutbox } from "../outbox";
import type { PushNotification, PushSender } from "./types";

export class MockPushSender implements PushSender {
  readonly name = "mock";

  async send(notification: PushNotification) {
    return writeToOutbox({
      channel: "push",
      recipient: notification.recipient,
      subject: notification.title,
      body: notification.body,
      meta: { url: notification.url },
    });
  }
}
