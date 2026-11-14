import "server-only";

import { writeToOutbox } from "../outbox";
import type { PushNotification } from "../push/types";
import type { AppPushSender, AppPushTarget } from "./types";

/** The demo and tests: the message goes to the outbox. */
export class MockAppPushSender implements AppPushSender {
  readonly name = "mock";

  async send(target: AppPushTarget, notification: PushNotification) {
    return writeToOutbox({
      channel: "push",
      recipient: notification.recipient,
      subject: notification.title,
      body: notification.body,
      meta: { url: notification.url, app: target.platform },
    });
  }
}
