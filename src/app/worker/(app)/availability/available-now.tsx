"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AVAILABLE_NOW_HOURS } from "@/domain/availability";

import { setAvailableNow } from "./actions";

/** The "available now" switch for urgent work (brief §4.1 step 8). */
export function AvailableNow({
  on,
  untilLabel,
  canUse,
}: {
  on: boolean;
  /** "2:30 pm", when on. */
  untilLabel: string | null;
  canUse: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(on);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
      <Label htmlFor="available_now" className="flex-col items-start gap-1">
        <span className="text-base">Available now</span>
        <span className="font-normal text-muted-foreground">
          {!canUse
            ? "Once you're verified, switch this on to get urgent work that starts soon."
            : optimistic && untilLabel
              ? `You're showing as available until ${untilLabel}.`
              : `Switch on when you can start work straight away. It turns off after ${AVAILABLE_NOW_HOURS} hours.`}
        </span>
      </Label>
      <Switch
        id="available_now"
        checked={optimistic}
        disabled={!canUse || pending}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            setOptimistic(checked);
            const result = await setAvailableNow(checked);
            if (result.status === "error") toast.error(result.message);
          })
        }
      />
    </div>
  );
}
