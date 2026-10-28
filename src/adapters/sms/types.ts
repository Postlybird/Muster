export type SmsMessage = {
  /** E.164, e.g. +61412345678. */
  to: string;
  body: string;
  /** Urgent call-outs; still subject to the worker's opt-in. */
  urgent?: boolean;
};

/** Sends texts (login codes, urgent work). Real provider: Twilio (brief §8). */
export interface SmsSender {
  readonly name: string;
  send(message: SmsMessage): Promise<{ id: string }>;
}
