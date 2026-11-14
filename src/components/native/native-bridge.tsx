"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { appLinkPath, inNativeApp } from "@/lib/native-app";

/**
 * Inside the phone apps only (docs/apps.md): hides the opening screen once
 * the site is ready, and opens links the app was opened with (like a
 * call-out's text or a sign-in email) and tapped notifications on the
 * matching page.
 */
export function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!inNativeApp()) return;
    let removed = false;
    let remove: (() => Promise<void>) | undefined;

    void (async () => {
      const { registerPlugin } = await import("@capacitor/core");
      type Listener = { remove: () => Promise<void> };
      const SplashScreen = registerPlugin<{ hide: () => Promise<void> }>(
        "SplashScreen",
      );
      const App = registerPlugin<{
        addListener: (
          event: "appUrlOpen",
          handler: (event: { url: string }) => void,
        ) => Promise<Listener>;
      }>("App");
      const Messaging = registerPlugin<{
        addListener: (
          event: "notificationActionPerformed",
          handler: (event: {
            notification: { data?: { url?: unknown } };
          }) => void,
        ) => Promise<Listener>;
      }>("FirebaseMessaging");

      await SplashScreen.hide().catch(() => undefined);
      const open = (url: unknown) => {
        if (typeof url !== "string") return;
        const path = appLinkPath(
          new URL(url, window.location.origin).toString(),
          window.location.origin,
        );
        if (path) router.push(path);
      };
      const listeners = await Promise.all([
        App.addListener("appUrlOpen", ({ url }) => open(url)),
        // Tapping a notification opens its page.
        Messaging.addListener("notificationActionPerformed", (event) =>
          open(event.notification.data?.url),
        ).catch(() => null),
      ]);
      const removeAll = async () => {
        await Promise.all(listeners.map((listener) => listener?.remove()));
      };
      if (removed) await removeAll();
      else remove = removeAll;
    })();

    return () => {
      removed = true;
      void remove?.();
    };
  }, [router]);

  return null;
}
