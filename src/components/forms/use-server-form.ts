"use client";

import { startTransition, useActionState } from "react";

import { idle, type ActionState } from "@/lib/forms";

/**
 * Runs a Server Action from a form without React's automatic form reset,
 * so a validation error never wipes out what the person typed.
 */
export function useServerForm(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
) {
  const [state, dispatch, pending] = useActionState(action, idle);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  return { state, onSubmit, pending, fieldErrors };
}
