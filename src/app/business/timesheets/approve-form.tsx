"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { approveTimesheets } from "./actions";

export type HoursToApprove = {
  id: string;
  name: string;
  day: string;
  where: string;
  hours: string;
  rostered: string;
  flags: string[];
  workerNote: string | null;
  approveBy: string;
};

/** Hours waiting for the business, all ticked: approve them in one go. */
export function ApproveForm({ items }: { items: HoursToApprove[] }) {
  const [chosen, setChosen] = useState(() => new Set(items.map((i) => i.id)));
  const { state, onSubmit, pending } = useServerForm(async (prev, formData) => {
    const result = await approveTimesheets(prev, formData);
    if (result.status === "success") toast.success(result.message);
    return result;
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <ul className="divide-y rounded-lg border bg-card">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 p-4">
            <Checkbox
              id={`timesheet-${item.id}`}
              name="timesheet"
              value={item.id}
              checked={chosen.has(item.id)}
              onCheckedChange={(checked) =>
                setChosen((current) => {
                  const next = new Set(current);
                  if (checked === true) next.add(item.id);
                  else next.delete(item.id);
                  return next;
                })
              }
              className="mt-0.5"
              aria-describedby={`timesheet-${item.id}-detail`}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor={`timesheet-${item.id}`} className="font-medium">
                {item.name}, {item.day}
              </Label>
              <div
                id={`timesheet-${item.id}-detail`}
                className="space-y-1 text-sm"
              >
                <p>{item.hours}</p>
                <p className="text-muted-foreground">
                  {item.rostered} · {item.where}
                </p>
                {item.workerNote ? (
                  <p className="[overflow-wrap:anywhere]">
                    Their note: &ldquo;{item.workerNote}&rdquo;
                  </p>
                ) : null}
                <p className="text-muted-foreground">
                  Approve by {item.approveBy}
                </p>
              </div>
              {item.flags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.flags.map((flag) => (
                    <Badge key={flag} variant="warning">
                      {flag}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <Link
                href={`/business/timesheets/${item.id}`}
                className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
                aria-label={`Check or change ${item.name}'s hours for ${item.day}`}
              >
                Check or change
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <ActionFeedback state={state} successToast={false} />
      <SubmitButton
        pending={pending}
        pendingText="Approving…"
        disabled={chosen.size === 0}
        size="lg"
        className="w-full sm:w-auto"
      >
        {chosen.size === 1
          ? "Approve 1 timesheet"
          : `Approve ${chosen.size} timesheets`}
      </SubmitButton>
    </form>
  );
}
