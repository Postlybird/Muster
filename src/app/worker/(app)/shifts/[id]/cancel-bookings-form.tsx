"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { shiftsLabel } from "@/domain/bookings";

import { cancelMyBookings } from "./actions";

export type BookingChoice = {
  id: string;
  day: string;
  detail: string;
  /** Inside the late cancellation window. */
  late: boolean;
};

/** "Can't make it?": cancel some or all of a job's bookings (brief §4.5). */
export function CancelBookingsForm({
  jobId,
  bookings,
  lateHours,
}: {
  jobId: string;
  bookings: BookingChoice[];
  lateHours: number;
}) {
  const [chosen, setChosen] = useState(
    () => new Set(bookings.map((b) => b.id)),
  );
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    async (prev, formData) => {
      const result = await cancelMyBookings(jobId, prev, formData);
      if (result.status === "success") toast.success(result.message);
      return result;
    },
  );
  const late = bookings.some((b) => b.late && chosen.has(b.id));

  return (
    <details className="rounded-md border bg-card">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
        Can&apos;t make it?
      </summary>
      <form onSubmit={onSubmit} noValidate className="space-y-4 border-t p-3">
        {bookings.length > 1 ? (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Which shifts can&apos;t you do?
            </legend>
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-start gap-3">
                <Checkbox
                  id={`booking-${booking.id}`}
                  name="booking"
                  value={booking.id}
                  checked={chosen.has(booking.id)}
                  onCheckedChange={(checked) =>
                    setChosen((current) => {
                      const next = new Set(current);
                      if (checked === true) next.add(booking.id);
                      else next.delete(booking.id);
                      return next;
                    })
                  }
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`booking-${booking.id}`}
                  className="flex flex-col items-start gap-0.5 font-normal"
                >
                  <span className="font-medium">{booking.day}</span>
                  <span className="text-muted-foreground">
                    {booking.detail}
                  </span>
                </Label>
              </div>
            ))}
            {fieldErrors?.booking ? (
              <p className="text-sm text-destructive">
                {fieldErrors.booking[0]}
              </p>
            ) : null}
          </fieldset>
        ) : (
          <input type="hidden" name="booking" value={bookings[0]?.id} />
        )}
        <FormField id="reason" label="Why?" error={fieldErrors?.reason}>
          {(props) => (
            <NativeSelect {...props} name="reason" defaultValue="">
              <option value="" disabled>
                Choose a reason
              </option>
              <option>I&apos;m sick</option>
              <option>Family emergency</option>
              <option>Transport problem</option>
              <option>Other</option>
            </NativeSelect>
          )}
        </FormField>
        <FormField id="note" label="Anything else? (optional)">
          {(props) => (
            <Textarea {...props} name="note" rows={2} maxLength={300} />
          )}
        </FormField>
        <p className="text-sm text-muted-foreground">
          {late
            ? `It's less than ${lateHours} hours to the start, so this counts against your reliability. The business is told and we offer the shift to other workers.`
            : "The business is told and we offer the shift to other workers."}
        </p>
        <ActionFeedback state={state} successToast={false} />
        <SubmitButton
          pending={pending}
          pendingText="Cancelling…"
          variant="destructive"
          disabled={chosen.size === 0}
        >
          Cancel {shiftsLabel(chosen.size)}
        </SubmitButton>
      </form>
    </details>
  );
}
