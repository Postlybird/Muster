"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { cancelShifts } from "./actions";

/** Cancels a shift, or every shift still to come, with a reason (brief §4.5). */
export function CancelWork({
  jobId,
  shiftIds,
  trigger,
  title,
  description,
  confirmLabel,
}: {
  jobId: string;
  shiftIds: string[];
  trigger: string;
  title: string;
  description: string;
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    async (prev, formData) => {
      const result = await cancelShifts(jobId, shiftIds, prev, formData);
      if (result.status === "success") {
        toast.success(result.message);
        setOpen(false);
      }
      return result;
    },
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField
            id="reason"
            label="Why? We pass this on to anyone booked."
            error={fieldErrors?.reason}
          >
            {(props) => (
              <Textarea {...props} name="reason" rows={3} maxLength={500} />
            )}
          </FormField>
          <ActionFeedback state={state} successToast={false} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Keep it
              </Button>
            </DialogClose>
            <SubmitButton
              pending={pending}
              pendingText="Cancelling…"
              variant="destructive"
            >
              {confirmLabel}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
