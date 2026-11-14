"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { ConfirmAction } from "@/components/forms/confirm-action";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/forms";

/**
 * Delete my account's button and its "are you sure". Once the account is
 * closed, the goodbye page replaces this one, so going back doesn't return
 * to the signed-in app.
 */
export function DeleteAccountButton({
  action,
  description,
}: {
  action: () => Promise<ActionState>;
  description: string;
}) {
  const router = useRouter();
  return (
    <ConfirmAction
      trigger={
        <Button variant="destructive" className="min-h-11">
          <Trash2 aria-hidden="true" />
          Delete my account
        </Button>
      }
      title="Delete your account?"
      description={description}
      confirmLabel="Delete my account"
      action={async () => {
        const result = await action();
        if (result.status === "success") {
          router.replace("/account-closed");
          router.refresh();
          return { status: "idle" };
        }
        return result;
      }}
    />
  );
}
