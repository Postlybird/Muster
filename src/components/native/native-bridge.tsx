"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { appLinkPath, inNativeApp } from "@/lib/native-app";

/**
 * Inside the phone apps only (docs/apps.md): hides the opening screen once
 * the site is ready, and opens links the app was opened with, like a
 * call-out's text or a sign-in email, on the matching page.
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

      await SplashScreen.hide().catch(() => undefined);
      const listener = await App.addListener("appUrlOpen", ({ url }) => {
        const path = appLinkPath(url, window.location.origin);
        if (path) router.push(path);
      });
      if (removed) await listener.remove();
      else remove = () => listener.remove();
    })();

    return () => {
      removed = true;
      void remove?.();
    };
  }, [router]);

  return null;
}
