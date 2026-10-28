"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/** A submit button that shows progress while its form is saving. */
export function SubmitButton({
  children = "Save",
  pendingText = "Saving…",
  pending: pendingProp,
  ...props
}: React.ComponentProps<typeof Button> & {
  pendingText?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {pending ? pendingText : children}
    </Button>
  );
}
