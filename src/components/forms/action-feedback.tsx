"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionState } from "@/lib/forms";

/**
 * Shows a toast when a save succeeds, and the error in the form (where
 * screen readers announce it) when it fails.
 */
export function ActionFeedback({ state }: { state: ActionState }) {
  useEffect(() => {
    if (state.status === "success") toast.success(state.message);
  }, [state]);

  if (state.status !== "error") return null;
  return (
    <Alert variant="destructive">
      <AlertDescription className="text-foreground">
        {state.message}
      </AlertDescription>
    </Alert>
  );
}
