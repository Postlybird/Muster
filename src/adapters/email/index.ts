import "server-only";

import { providerFor } from "../provider";
import { MockEmailSender } from "./mock";
import type { EmailSender } from "./types";

export type { EmailAttachment, EmailMessage, EmailSender } from "./types";

export function getEmailSender(): EmailSender {
  providerFor("EMAIL_PROVIDER", ["mock"]);
  return new MockEmailSender();
}
