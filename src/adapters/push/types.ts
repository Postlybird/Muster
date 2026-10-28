/** A browser that agreed to get notifications (its push subscription). */
export type PushTarget = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushNotification = {
  /** Who it's for (shown in the demo outbox). */
  recipient: string;
  title: string;
  body: string;
  /** Page to open when tapped. */
  url?: string;
};

/**
 * Web push to the installed app (brief §5), with the free Web Push
 * protocol and our own VAPID keys.
 */
export interface PushSender {
  readonly name: string;
  /** "gone": the browser has turned notifications off, so forget it. */
  send(
    target: PushTarget,
    notification: PushNotification,
  ): Promise<{ id: string } | "gone">;
}
