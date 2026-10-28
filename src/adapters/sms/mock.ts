import "server-only";

import { writeToOutbox } from "../outbox";
import type { SmsMessage, SmsSender } from "./types";

export class MockSmsSender implements SmsSender {
  readonly name = "mock";

  async send(message: SmsMessage) {
    return writeToOutbox({
      channel: "sms",
      recipient: message.to,
      body: message.body,
      meta: { urgent: message.urgent ?? false },
    });
  }
}
