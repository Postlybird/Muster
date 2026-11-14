"use client";

import { BellOff, BellRing, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/forms";
import { nativePlatform } from "@/lib/native-app";

/** The parts of the Firebase messaging plugin this uses (docs/apps.md). */
type Messaging = {
  checkPermissions(): Promise<{ receive: string }>;
  requestPermissions(): Promise<{ receive: string }>;
  getToken(): Promise<{ token: string }>;
  deleteToken(): Promise<void>;
};

async function messaging(): Promise<Messaging> {
  const { registerPlugin } = await import("@capacitor/core");
  return registerPlugin<Messaging>("FirebaseMessaging");
}

/** This phone's token, once notifications are on. */
const TOKEN_KEY = "app-push-token";

function savedToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Without storage, the switch just shows "off" next time.
  }
}

type State = "checking" | "on" | "off" | "blocked" | "unavailable";

/**
 * Notifications on this phone, inside the app: the phone's own permission
 * and Firebase, instead of the browser's (PushToggle).
 */
export function AppPushToggle({
  turnOn,
  turnOff,
}: {
  turnOn: (token: string, platform: string) => Promise<ActionState>;
  turnOff: (token: string) => Promise<ActionState>;
}) {
  const [state, setState] = useState<State>("checking");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    async function check() {
      const { receive } = await (await messaging()).checkPermissions();
      if (!live) return;
      if (receive === "denied") setState("blocked");
      else setState(receive === "granted" && savedToken() ? "on" : "off");
    }
    check().catch(() => setState("unavailable"));
    return () => {
      live = false;
    };
  }, []);

  function show(result: ActionState) {
    if (result.status === "error") toast.error(result.message);
    else if (result.status === "success") toast.success(result.message);
  }

  function on() {
    startTransition(async () => {
      const plugin = await messaging();
      const { receive } = await plugin.requestPermissions();
      if (receive !== "granted") {
        setState(receive === "denied" ? "blocked" : "off");
        return;
      }
      let token: string;
      try {
        ({ token } = await plugin.getToken());
      } catch {
        setState("unavailable");
        return;
      }
      const result = await turnOn(token, nativePlatform());
      show(result);
      if (result.status === "success") {
        saveToken(token);
        setState("on");
      }
    });
  }

  function off() {
    startTransition(async () => {
      const token = savedToken();
      await (await messaging()).deleteToken().catch(() => undefined);
      if (token) show(await turnOff(token));
      saveToken(null);
      setState("off");
    });
  }

  if (state === "checking") {
    return <p className="text-sm text-muted-foreground">Checking…</p>;
  }
  if (state === "unavailable") {
    return (
      <p className="text-sm">
        This version of the app can&apos;t show notifications yet, so we&apos;ll
        text you instead.
      </p>
    );
  }
  if (state === "blocked") {
    return (
      <p className="text-sm">
        Notifications are turned off for this app in your phone&apos;s settings.
        Turn them on there, then come back. Until then we&apos;ll text you.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {state === "on"
          ? "Notifications are on for this phone. We send messages here instead of texting you."
          : "Turn on notifications to get messages here instead of by text."}
      </p>
      {state === "on" ? (
        <Button variant="outline" onClick={off} disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <BellOff aria-hidden />
          )}
          Turn off notifications
        </Button>
      ) : (
        <Button onClick={on} disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <BellRing aria-hidden />
          )}
          Turn on notifications
        </Button>
      )}
    </div>
  );
}
