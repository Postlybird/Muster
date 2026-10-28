"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { renderMessage } from "@/domain/notifications";
import type { ActionState } from "@/lib/forms";

/** A message's wording, with how it will look filled in. */
export function TemplateForm({
  action,
  initial,
  examples,
  worker,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial: { title: string; body: string };
  /** Example values for the preview, by placeholder. */
  examples: Record<string, string>;
  /** Workers see the app version too (push and the Notifications page). */
  worker: boolean;
}) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(action);
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const preview = renderMessage({ title, body }, examples, examples.link ?? "");

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField
          id="title"
          label={worker ? "Heading" : "Email subject"}
          hint={worker ? "The heading of push notifications." : undefined}
          error={fieldErrors?.title}
        >
          {(props) => (
            <Input
              {...props}
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
            />
          )}
        </FormField>
        <FormField id="body" label="Message" error={fieldErrors?.body}>
          {(props) => (
            <Textarea
              {...props}
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={10}
              maxLength={4000}
            />
          )}
        </FormField>
        <ActionFeedback state={state} />
        <SubmitButton pending={pending}>Save wording</SubmitButton>
      </form>

      <section aria-labelledby="preview" className="space-y-3">
        <h2 id="preview" className="text-lg font-semibold">
          Preview, with example details
        </h2>
        <div className="space-y-1 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            {worker ? "By text" : "By email"}
          </p>
          {worker ? null : <p className="font-medium">{preview.title}</p>}
          <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-line">
            {preview.text}
          </p>
        </div>
        {worker ? (
          <div className="space-y-1 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              In the app and as a push notification (tapping it opens the link)
            </p>
            <p className="font-medium">{preview.title}</p>
            <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-line">
              {preview.short}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
