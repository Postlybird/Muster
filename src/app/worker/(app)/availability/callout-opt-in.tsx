"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { setCalloutOptIn } from "./actions";

/**
 * The call-outs switch: urgent work nearby, by app notification or email,
 * and by text once texts are on (owner, 16/11/2026).
 */
export function CalloutOptIn({
  on,
  payPct,
  textsOn,
}: {
  on: boolean;
  payPct: number;
  textsOn: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(on);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
      <Label htmlFor="callouts" className="flex-col items-start gap-1">
        <span className="text-base">Call-outs</span>
        <span className="font-normal text-muted-foreground">
          {textsOn
            ? "A text and an app notification, at any hour,"
            : "An app notification or email, at any hour,"}{" "}
          when urgent work nearby needs someone fast. The first to accept gets
          it, and call-outs pay {payPct}% more.
        </span>
      </Label>
      <Switch
        id="callouts"
        checked={optimistic}
        disabled={pending}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            setOptimistic(checked);
            const result = await setCalloutOptIn(checked);
            if (result.status === "error") toast.error(result.message);
          })
        }
      />
    </div>
  );
}
