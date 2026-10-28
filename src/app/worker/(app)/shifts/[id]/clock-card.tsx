"use client";

import { Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { clockShift, type ClockInput } from "./actions";

type Queued = ClockInput & { jobId: string; assignmentId: string };

const QUEUE_KEY = "clock-queue";

// Clock-ins waiting for a signal live in the phone's storage, read through
// a tiny store so the card shows them straight away.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function queueSnapshot(): string {
  try {
    return localStorage.getItem(QUEUE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function readQueue(): Queued[] {
  try {
    return JSON.parse(queueSnapshot()) as Queued[];
  } catch {
    return [];
  }
}

function writeQueue(items: Queued[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Private browsing: nothing can wait, but sending still works.
  }
  for (const listener of listeners) listener();
}

/** Where the phone is, or null if it can't or won't say. */
function currentPosition(): Promise<GeolocationPosition | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      enableHighAccuracy: true,
      timeout: 15_000,
      // A fresh fix: a cached one could be from before they arrived.
      maximumAge: 0,
    }),
  );
}

/**
 * Clocking in and out on the day (brief §4.6), with a location check. With
 * no signal, the clock-in is kept on the phone with the time it happened,
 * and sent as soon as the phone is back online.
 */
export function ClockCard({
  jobId,
  assignmentId,
  next,
}: {
  jobId: string;
  assignmentId: string;
  /** What the worker can do now. */
  next: "clock_in" | "clock_out";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [needsReason, setNeedsReason] = useState<ClockInput | null>(null);
  const [reason, setReason] = useState("");
  const queued = useSyncExternalStore(subscribe, queueSnapshot, () => "[]");
  const waiting = useMemo(() => {
    try {
      return (
        (JSON.parse(queued) as Queued[]).find(
          (item) => item.assignmentId === assignmentId,
        ) ?? null
      );
    } catch {
      return null;
    }
  }, [queued, assignmentId]);

  // Anything saved without signal goes as soon as there's a connection.
  const sendSaved = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0 || !navigator.onLine) return;
    const left: Queued[] = [];
    for (const item of queue) {
      try {
        const result = await clockShift(item.jobId, item.assignmentId, {
          ...item,
          offline: true,
        });
        if (result.status === "error") toast.error(result.message);
        else if (result.status === "success") toast.success(result.message);
      } catch {
        left.push(item);
      }
    }
    writeQueue(left);
    router.refresh();
  }, [router]);

  useEffect(() => {
    void sendSaved();
    window.addEventListener("online", sendSaved);
    return () => window.removeEventListener("online", sendSaved);
  }, [sendSaved]);

  async function send(input: ClockInput) {
    const save = () =>
      writeQueue([...readQueue(), { ...input, jobId, assignmentId }]);
    if (!navigator.onLine) return save();
    try {
      const result = await clockShift(jobId, assignmentId, input);
      if (result.status === "error") {
        if (result.fieldErrors?.reason) setNeedsReason(input);
        else toast.error(result.message);
        return;
      }
      setNeedsReason(null);
      setReason("");
      if (result.status === "success") toast.success(result.message);
    } catch {
      save();
    }
  }

  async function onClock() {
    setBusy(true);
    try {
      const position = await currentPosition();
      await send({
        kind: next,
        occurredAt: new Date().toISOString(),
        lat: position?.coords.latitude ?? null,
        lng: position?.coords.longitude ?? null,
        accuracy: position?.coords.accuracy ?? null,
        reason: "",
        offline: false,
      });
    } finally {
      setBusy(false);
    }
  }

  async function onReason(event: React.FormEvent) {
    event.preventDefault();
    if (!needsReason || !reason.trim()) return;
    setBusy(true);
    try {
      await send({ ...needsReason, reason: reason.trim() });
    } finally {
      setBusy(false);
    }
  }

  const label = next === "clock_in" ? "Clock in" : "Clock out";

  if (waiting) {
    return (
      <Alert variant="info">
        <AlertDescription>
          {waiting.kind === "clock_in" ? "Clock-in" : "Clock-out"} saved on your
          phone at{" "}
          {new Date(waiting.occurredAt).toLocaleTimeString("en-AU", {
            hour: "numeric",
            minute: "2-digit",
          })}
          . There&apos;s no signal, so we&apos;ll send it as soon as you&apos;re
          back online.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {needsReason ? (
        <form onSubmit={onReason} className="space-y-3">
          <Alert variant="warning">
            <AlertDescription>
              Your phone says you&apos;re not at the site, or it couldn&apos;t
              tell where you are. You can still{" "}
              {next === "clock_in" ? "clock in" : "clock out"}: just say why.
            </AlertDescription>
          </Alert>
          <div className="space-y-1.5">
            <Label htmlFor="clock-reason">Why?</Label>
            <Textarea
              id="clock-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
          <Button type="submit" size="lg" disabled={busy || !reason.trim()}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {label} anyway
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={onClock}
        >
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <MapPin aria-hidden />
          )}
          {busy ? "Checking where you are…" : label}
        </Button>
      )}
      <p className="text-sm text-muted-foreground">
        We use your phone&apos;s location to check you&apos;re at the site.{" "}
        <Link
          href={`/worker/shifts/${jobId}/safety?booking=${assignmentId}`}
          className="font-medium text-primary underline underline-offset-4"
        >
          Report a safety issue
        </Link>
      </p>
    </div>
  );
}
