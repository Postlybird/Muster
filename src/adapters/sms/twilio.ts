import "server-only";

import type { SmsMessage, SmsSender } from "./types";

/** Phone numbers in Twilio's error messages are masked before they're logged. */
function maskNumbers(text: string): string {
  return text.replace(/\+?\d[\d\s-]{6,}\d/g, "[number]");
}

/**
 * Real texts through Twilio (brief §8), chosen with SMS_PROVIDER=twilio.
 * They go out through a Messaging Service (TWILIO_MESSAGING_SERVICE_SID)
 * whose sender is our registered sender name, so they show as from us
 * (since 1 July 2026, an unregistered name shows as "Unverified"). The same
 * service sends the live site's mobile confirmation codes
 * (deploy/shifta-live).
 */
export class TwilioSmsSender implements SmsSender {
  readonly name = "twilio";
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly messagingServiceSid: string;

  constructor(
    env: Record<string, string | undefined> = process.env,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = env.TWILIO_AUTH_TOKEN?.trim();
    const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID?.trim();
    if (!accountSid || !authToken || !messagingServiceSid) {
      throw new Error(
        "Texts through Twilio need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID. See .env.example.",
      );
    }
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.messagingServiceSid = messagingServiceSid;
  }

  async send(message: SmsMessage): Promise<{ id: string }> {
    const response = await this.fetchImpl(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.accountSid}:${this.authToken}`,
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: message.to,
          Body: message.body,
          MessagingServiceSid: this.messagingServiceSid,
        }).toString(),
      },
    );
    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as {
        code?: number;
        message?: string;
      } | null;
      throw new Error(
        `Twilio didn't send the text (${response.status}${
          detail?.code ? `, error ${detail.code}` : ""
        }): ${maskNumbers(detail?.message ?? "").slice(0, 300)}`,
      );
    }
    const result = (await response.json()) as { sid?: string };
    if (!result.sid) throw new Error("Twilio didn't return a message id");
    return { id: result.sid };
  }
}
