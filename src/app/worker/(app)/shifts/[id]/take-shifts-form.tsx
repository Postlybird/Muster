"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { WorkerWordsField } from "@/components/forms/worker-words-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { shiftsLabel } from "@/domain/bookings";

import { takeShifts } from "./actions";

export type ShiftChoice = { id: string; day: string; detail: string };

/**
 * Apply for ("I'll choose") or accept ("First in") a job's shifts: all of
 * them by default, or chosen days (plan: "Accept all days" by default).
 * Applying comes with an optional note for the business.
 */
export function TakeShiftsForm({
  jobId,
  mode,
  shifts,
  note = null,
}: {
  jobId: string;
  mode: "pick" | "auto";
  shifts: ShiftChoice[];
  /** The note already sent with other days of this job. */
  note?: string | null;
}) {
  const [chosen, setChosen] = useState(() => new Set(shifts.map((s) => s.id)));
  // The page moves on once it's done, so the toast comes from here.
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    async (prev, formData) => {
      const result = await takeShifts(jobId, mode, prev, formData);
      if (result.status === "success") toast.success(result.message);
      return result;
    },
  );
  const several = shifts.length > 1;
  const verb = mode === "auto" ? "Accept" : "Apply for";
  const label = several
    ? `${verb} ${shiftsLabel(chosen.size)}`
    : mode === "auto"
      ? "Accept this shift"
      : "Apply";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {several ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            Which days? You can choose some or all of them.
          </legend>
          {shifts.map((shift) => (
            <div key={shift.id} className="flex items-start gap-3">
              <Checkbox
                id={`shift-${shift.id}`}
                name="shift"
                value={shift.id}
                checked={chosen.has(shift.id)}
                onCheckedChange={(checked) =>
                  setChosen((current) => {
                    const next = new Set(current);
                    if (checked === true) next.add(shift.id);
                    else next.delete(shift.id);
                    return next;
                  })
                }
                className="mt-0.5"
                aria-describedby={`shift-${shift.id}-detail`}
              />
              <Label
                htmlFor={`shift-${shift.id}`}
                className="flex flex-col items-start gap-0.5 font-normal"
              >
                <span className="font-medium">{shift.day}</span>
                <span
                  id={`shift-${shift.id}-detail`}
                  className="text-muted-foreground"
                >
                  {shift.detail}
                </span>
              </Label>
            </div>
          ))}
          {fieldErrors?.shift ? (
            <p className="text-sm text-destructive">{fieldErrors.shift[0]}</p>
          ) : null}
        </fieldset>
      ) : (
        <input type="hidden" name="shift" value={shifts[0]?.id} />
      )}
      {mode === "pick" ? (
        <WorkerWordsField
          id="note"
          name="note"
          label="Why you're a good fit (optional)"
          hint="The business reads this with your application: your experience with this kind of work, your tickets, anything that makes you stand out. No phone numbers, emails or links."
          defaultValue={note}
          error={fieldErrors?.note}
        />
      ) : null}
      <ActionFeedback state={state} successToast={false} />
      <p className="text-sm text-muted-foreground">
        {mode === "auto"
          ? "First in: accepting books you straight away."
          : "Applying is a promise to work if the business picks you. You can withdraw until then."}
      </p>
      <SubmitButton
        pending={pending}
        pendingText={mode === "auto" ? "Booking…" : "Applying…"}
        disabled={chosen.size === 0}
        size="lg"
        className="w-full sm:w-auto"
      >
        {label}
      </SubmitButton>
    </form>
  );
}
