import "server-only";

import { writeToOutbox } from "../outbox";
import type { EmailMessage, EmailSender } from "./types";

export class MockEmailSender implements EmailSender {
  readonly name = "mock";

  async send(message: EmailMessage) {
    return writeToOutbox({
      channel: "email",
      recipient: message.to,
      subject: message.subject,
      body: message.text,
      meta: {
        tag: message.tag,
        attachments: message.attachments?.map((a) => a.filename) ?? [],
      },
    });
  }
}
