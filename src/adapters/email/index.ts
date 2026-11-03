import "server-only";

import { providerFor } from "../provider";
import { MockEmailSender } from "./mock";
import { ResendEmailSender } from "./resend";
import type { EmailSender } from "./types";

export type { EmailAttachment, EmailMessage, EmailSender } from "./types";

export function getEmailSender(): EmailSender {
  return providerFor("EMAIL_PROVIDER", ["mock", "resend"]) === "resend"
    ? new ResendEmailSender()
    : new MockEmailSender();
}
