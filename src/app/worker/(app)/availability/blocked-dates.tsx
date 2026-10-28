"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { addBlockedDate, removeBlockedDate } from "./actions";

export type BlockedDate = { id: string; label: string; note: string | null };

function RemoveButton({ block }: { block: BlockedDate }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={`Remove ${block.label}`}
      onClick={() =>
        startTransition(async () => {
          const result = await removeBlockedDate(block.id);
          if (result.status === "error") toast.error(result.message);
        })
      }
    >
      <X aria-hidden />
    </Button>
  );
}

export function BlockedDates({
  blocks,
  today,
}: {
  blocks: BlockedDate[];
  today: string;
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(addBlockedDate);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-4">
      {blocks.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {blocks.map((block) => (
            <li
              key={block.id}
              className="flex items-center justify-between gap-3 py-1 pr-1 pl-4"
            >
              <span>
                {block.label}
                {block.note ? (
                  <span className="text-muted-foreground"> · {block.note}</span>
                ) : null}
              </span>
              <RemoveButton block={block} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No dates blocked out. We won&apos;t offer you shifts on dates you
          block out.
        </p>
      )}
      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-end"
      >
        <FormField id="block-date" label="Date" error={errors?.date}>
          {(props) => (
            <Input
              {...props}
              type="date"
              name="date"
              min={today}
              className="sm:w-44"
            />
          )}
        </FormField>
        <FormField id="block-note" label="Note (optional)" error={errors?.note}>
          {(props) => (
            <Input {...props} name="note" maxLength={100} autoComplete="off" />
          )}
        </FormField>
        <SubmitButton pending={pending} variant="outline" pendingText="Adding…">
          Block out
        </SubmitButton>
        <div className="sm:col-span-3">
          <ActionFeedback state={state} />
        </div>
      </form>
    </div>
  );
}
