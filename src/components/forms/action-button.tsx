"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/forms";

/**
 * A button that runs a Server Action straight away (no confirmation) and
 * shows the result as a toast. The action may redirect instead.
 */
export function ActionButton({
  action,
  children,
  pendingText,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "type"> & {
  action: () => Promise<ActionState>;
  pendingText?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending || props.disabled}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (result.status === "error") toast.error(result.message);
          else if (result.status === "success") toast.success(result.message);
        })
      }
      {...props}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
