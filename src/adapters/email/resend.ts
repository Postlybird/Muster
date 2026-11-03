import "server-only";

import { brand } from "@/config/brand";

import type { EmailMessage, EmailSender } from "./types";

const RESEND_API = "https://api.resend.com/emails";

/** Resend accepts tag values of ASCII letters, numbers, underscores and dashes. */
function tagValue(tag: string): string {
  return tag.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256);
}

/**
 * Real email through Resend (brief §8), chosen with EMAIL_PROVIDER=resend.
 * RESEND_API_KEY is the key; EMAIL_FROM is who it's from, on a domain
 * verified in Resend (like "Shifta <hello@shifta.com.au>"). Replies go to
 * EMAIL_REPLY_TO, or the support address.
 */
export class ResendEmailSender implements EmailSender {
  readonly name = "resend";
  private readonly apiKey: string;
  private readonly from: string;
  private readonly replyTo: string;

  constructor(
    env: Record<string, string | undefined> = process.env,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    const apiKey = env.RESEND_API_KEY?.trim();
    const from = env.EMAIL_FROM?.trim();
    if (!apiKey || !from) {
      throw new Error(
        "Email through Resend needs RESEND_API_KEY and EMAIL_FROM. See .env.example.",
      );
    }
    this.apiKey = apiKey;
    this.from = from;
    this.replyTo = env.EMAIL_REPLY_TO?.trim() || brand.supportEmail;
  }

  async send(message: EmailMessage): Promise<{ id: string }> {
    const response = await this.fetchImpl(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        reply_to: this.replyTo,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        ...(message.tag
          ? { tags: [{ name: "template", value: tagValue(message.tag) }] }
          : {}),
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((attachment) => ({
                filename: attachment.filename,
                content: attachment.content,
                content_type: attachment.contentType,
              })),
            }
          : {}),
      }),
    });
    if (!response.ok) {
      // Resend says what was wrong; the address isn't repeated in our logs.
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Resend didn't send the email (${response.status}): ${detail.slice(0, 300)}`,
      );
    }
    const result = (await response.json()) as { id?: string };
    if (!result.id) throw new Error("Resend didn't return an email id");
    return { id: result.id };
  }
}
