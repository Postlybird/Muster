export type PushNotification = {
  /** Who it's for (shown in the demo outbox). */
  recipient: string;
  title: string;
  body: string;
  /** Page to open when tapped. */
  url?: string;
};

/**
 * Web push to the installed app (brief §5). The real implementation uses
 * the free Web Push protocol with our own VAPID keys (step 1.14).
 */
export interface PushSender {
  readonly name: string;
  send(notification: PushNotification): Promise<{ id: string }>;
}
