"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ActionState } from "@/lib/forms";

export type PreferenceRow = {
  key: string;
  label: string;
  help: string;
  on: boolean;
};

/**
 * What someone hears about (brief §5). Critical messages are listed as
 * always sent, since they can't be turned off.
 */
export function PreferencesForm({
  action,
  choices,
  alwaysSent,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  choices: PreferenceRow[];
  /** Labels of the critical categories. */
  alwaysSent: string[];
}) {
  const { state, onSubmit, pending } = useServerForm(action);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ul className="space-y-3">
        {choices.map((choice) => (
          <li
            key={choice.key}
            className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4"
          >
            <Label
              htmlFor={`pref-${choice.key}`}
              className="flex-col items-start gap-1"
            >
              <span className="text-base">{choice.label}</span>
              <span className="font-normal text-muted-foreground">
                {choice.help}
              </span>
            </Label>
            <Switch
              id={`pref-${choice.key}`}
              name={choice.key}
              defaultChecked={choice.on}
            />
          </li>
        ))}
      </ul>
      {alwaysSent.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Always sent, because they matter: {alwaysSent.join(", ")}.
        </p>
      ) : null}
      <ActionFeedback state={state} />
      <SubmitButton pending={pending}>Save</SubmitButton>
    </form>
  );
}
