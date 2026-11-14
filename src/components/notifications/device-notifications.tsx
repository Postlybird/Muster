"use client";

import type { ActionState } from "@/lib/forms";
import { inNativeApp } from "@/lib/native-app";
import { useHydrated } from "@/lib/use-hydrated";

import { AppPushToggle } from "./app-push-toggle";
import { PushToggle } from "./push-toggle";

/**
 * "Notifications on this phone": the phone's own, inside the app
 * (docs/apps.md), or the browser's web push everywhere else.
 */
export function DeviceNotifications({
  publicKey,
  turnOn,
  turnOnDemo,
  turnOff,
  turnOnApp,
  turnOffApp,
}: {
  publicKey: string | null;
  turnOn: (subscription: unknown) => Promise<ActionState>;
  turnOnDemo: () => Promise<ActionState & { endpoint?: string }>;
  turnOff: (endpoint: string) => Promise<ActionState>;
  turnOnApp: (token: string, platform: string) => Promise<ActionState>;
  turnOffApp: (token: string) => Promise<ActionState>;
}) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">Checking…</p>;
  }
  return inNativeApp() ? (
    <AppPushToggle turnOn={turnOnApp} turnOff={turnOffApp} />
  ) : (
    <PushToggle
      publicKey={publicKey}
      turnOn={turnOn}
      turnOnDemo={turnOnDemo}
      turnOff={turnOff}
    />
  );
}
