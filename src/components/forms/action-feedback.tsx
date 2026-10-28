"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionState } from "@/lib/forms";

/**
 * Shows a toast when a save succeeds, and the error in the form (where
 * screen readers announce it) when it fails.
 */
export function ActionFeedback({
  state,
  successToast = true,
}: {
  state: ActionState;
  /** Off when the caller shows its own success message. */
  successToast?: boolean;
}) {
  useEffect(() => {
    if (successToast && state.status === "success") {
      toast.success(state.message);
    }
  }, [state, successToast]);

  if (state.status !== "error") return null;
  return (
    <Alert variant="destructive">
      <AlertDescription className="text-foreground">
        {state.message}
      </AlertDescription>
    </Alert>
  );
}
