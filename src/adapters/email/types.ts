export type EmailAttachment = {
  filename: string;
  contentType: string;
  /** Base64-encoded file contents. */
  content: string;
};

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** For grouping and searching, e.g. "invoice", "reminder". */
  tag?: string;
  attachments?: EmailAttachment[];
};

/** Sends email (summaries, invoices). Real provider: Resend (brief §8). */
export interface EmailSender {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id: string }>;
}
