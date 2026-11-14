import "server-only";

import { createSign } from "node:crypto";

import type { PushNotification } from "../push/types";
import type { AppPushSender, AppPushTarget } from "./types";

/**
 * Firebase Cloud Messaging's HTTP v1 API, signed in with the Firebase
 * project's service account (FIREBASE_SERVICE_ACCOUNT, its JSON key, in the
 * live site's settings). Messages carry the page to open when tapped.
 */
type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

/** The service account from the environment, or null if it isn't usable. */
export function serviceAccount(
  json = process.env.FIREBASE_SERVICE_ACCOUNT,
): ServiceAccount | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Partial<ServiceAccount>;
    return parsed.project_id && parsed.client_email && parsed.private_key
      ? (parsed as ServiceAccount)
      : null;
  } catch {
    return null;
  }
}

/** The message FCM sends to one phone. */
export function fcmMessage(
  target: AppPushTarget,
  notification: PushNotification,
) {
  return {
    message: {
      token: target.token,
      notification: { title: notification.title, body: notification.body },
      data: notification.url ? { url: notification.url } : {},
      android: { priority: "HIGH" },
      apns: { payload: { aps: { sound: "default" } } },
    },
  };
}

/** Whether FCM's answer means the phone has gone for good. */
export function tokenGone(status: number, body: string): boolean {
  if (status === 404) return true;
  return (
    status === 400 &&
    /UNREGISTERED|registration token is not a valid FCM registration token/i.test(
      body,
    )
  );
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

let cached: { token: string; expires: number } | null = null;

async function accessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expires - 60 > now) return cached.token;
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(account.private_key);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  });
  if (!response.ok) {
    throw new Error(`Firebase sign-in failed: ${response.status}`);
  }
  const { access_token, expires_in } = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cached = { token: access_token, expires: now + expires_in };
  return access_token;
}

export class FcmAppPushSender implements AppPushSender {
  readonly name = "fcm";

  async send(target: AppPushTarget, notification: PushNotification) {
    const account = serviceAccount();
    if (!account) throw new Error("FIREBASE_SERVICE_ACCOUNT isn't set up.");
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${await accessToken(account)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(fcmMessage(target, notification)),
      },
    );
    const body = await response.text();
    if (response.ok) {
      return { id: (JSON.parse(body) as { name: string }).name };
    }
    if (tokenGone(response.status, body)) return "gone" as const;
    throw new Error(`Firebase didn't send it: ${response.status} ${body}`);
  }
}
