"use client";

import { BellOff, BellRing, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/forms";

type State =
  "checking" | "on" | "off" | "blocked" | "install-first" | "unsupported";

const DEMO_KEY = "demo-push-endpoint";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function readDemo(): string | null {
  try {
    return window.localStorage.getItem(DEMO_KEY);
  } catch {
    return null;
  }
}

function writeDemo(endpoint: string | null) {
  try {
    if (endpoint) window.localStorage.setItem(DEMO_KEY, endpoint);
    else window.localStorage.removeItem(DEMO_KEY);
  } catch {
    // Private browsing: the demo device just isn't remembered.
  }
}

/**
 * Push notifications on this device (brief §5: web push to the installed
 * app). With no push keys in demo mode, a stand-in device sends messages
 * to the outbox instead.
 */
export function PushToggle({
  publicKey,
  turnOn,
  turnOnDemo,
  turnOff,
}: {
  publicKey: string | null;
  turnOn: (subscription: unknown) => Promise<ActionState>;
  turnOnDemo: () => Promise<ActionState & { endpoint?: string }>;
  turnOff: (endpoint: string) => Promise<ActionState>;
}) {
  const [state, setState] = useState<State>("checking");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const demo = !publicKey;

  useEffect(() => {
    let live = true;
    async function check() {
      if (demo) {
        const saved = readDemo();
        setEndpoint(saved);
        setState(saved ? "on" : "off");
        return;
      }
      const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const installed = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState(iOS && !installed ? "install-first" : "unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      const subscription = await registration.pushManager.getSubscription();
      if (!live) return;
      setEndpoint(subscription?.endpoint ?? null);
      setState(
        subscription
          ? "on"
          : Notification.permission === "denied"
            ? "blocked"
            : "off",
      );
    }
    check().catch(() => setState("unsupported"));
    return () => {
      live = false;
    };
  }, [demo]);

  function show(result: ActionState) {
    if (result.status === "error") toast.error(result.message);
    else if (result.status === "success") toast.success(result.message);
  }

  function on() {
    startTransition(async () => {
      if (demo) {
        const result = await turnOnDemo();
        show(result);
        if (result.status === "success" && result.endpoint) {
          writeDemo(result.endpoint);
          setEndpoint(result.endpoint);
          setState("on");
        }
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
      });
      const result = await turnOn(subscription.toJSON());
      show(result);
      if (result.status === "success") {
        setEndpoint(subscription.endpoint);
        setState("on");
      } else {
        await subscription.unsubscribe();
      }
    });
  }

  function off() {
    startTransition(async () => {
      if (!demo) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        await subscription?.unsubscribe();
      }
      if (endpoint) show(await turnOff(endpoint));
      writeDemo(null);
      setEndpoint(null);
      setState("off");
    });
  }

  if (state === "checking") {
    return <p className="text-sm text-muted-foreground">Checking…</p>;
  }
  if (state === "install-first") {
    return (
      <p className="text-sm">
        On an iPhone, add the app to your Home Screen first: tap Share, then Add
        to Home Screen. Open it from there and turn notifications on here.
      </p>
    );
  }
  if (state === "unsupported") {
    return (
      <p className="text-sm">
        This browser can&apos;t show notifications, so we&apos;ll text you
        instead.
      </p>
    );
  }
  if (state === "blocked") {
    return (
      <p className="text-sm">
        Notifications are blocked for this site in your browser&apos;s settings.
        Allow them there, then come back. Until then we&apos;ll text you.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {state === "on"
          ? "Notifications are on for this device. We send messages here instead of texting you."
          : "Turn on notifications to get messages here instead of by text."}
        {demo ? " (Demo: they go to the outbox, as push isn't set up.)" : ""}
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
