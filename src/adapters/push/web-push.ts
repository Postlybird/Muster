import "server-only";

import webpush from "web-push";

import { brand } from "@/config/brand";

import type { PushNotification, PushSender, PushTarget } from "./types";

/**
 * Real push notifications through the browser makers' push services, with
 * our VAPID keys. Free; no account needed.
 */
export class WebPushSender implements PushSender {
  readonly name = "webpush";

  constructor() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      throw new Error(
        "Push needs NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY. See .env.example.",
      );
    }
    webpush.setVapidDetails(
      `mailto:${brand.supportEmail}`,
      publicKey,
      privateKey,
    );
  }

  async send(target: PushTarget, notification: PushNotification) {
    try {
      const result = await webpush.sendNotification(
        target,
        JSON.stringify({
          title: notification.title,
          body: notification.body,
          url: notification.url,
        }),
        { TTL: 24 * 60 * 60 },
      );
      return { id: String(result.statusCode) };
    } catch (error) {
      if (
        error instanceof webpush.WebPushError &&
        (error.statusCode === 404 || error.statusCode === 410)
      ) {
        return "gone" as const;
      }
      throw error;
    }
  }
}

/** A new pair of VAPID keys, for setting up push. */
export function makeVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}
