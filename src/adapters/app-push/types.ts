import type { PushNotification } from "../push/types";

/** A phone with the app that turned notifications on (docs/apps.md). */
export type AppPushTarget = {
  token: string;
  platform: "ios" | "android";
};

/**
 * Notifications to the phone apps, through Firebase Cloud Messaging, which
 * passes iPhone ones on to Apple. Free.
 */
export interface AppPushSender {
  readonly name: string;
  /** "gone": the app was removed or the token replaced, so forget it. */
  send(
    target: AppPushTarget,
    notification: PushNotification,
  ): Promise<{ id: string } | "gone">;
}
