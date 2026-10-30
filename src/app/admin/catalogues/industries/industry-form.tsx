"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { INDUSTRY_ICONS } from "@/config/industry-icons";

import { saveIndustry } from "../actions";

export type IndustryFormValues = {
  id: string | null;
  name: string;
  summary: string;
  description: string;
  icon: string;
  active: boolean;
};

export function IndustryForm({ values }: { values: IndustryFormValues }) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveIndustry.bind(null, values.id));

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6">
      <FormField id="name" label="Name" error={errors?.name}>
        {(props) => (
          <Input {...props} name="name" defaultValue={values.name} required />
        )}
      </FormField>

      <FormField
        id="summary"
        label="One line about it"
        hint="On the industry's card on the website, like the kinds of staff."
        error={errors?.summary}
      >
        {(props) => (
          <Input
            {...props}
            name="summary"
            defaultValue={values.summary}
            maxLength={140}
            required
          />
        )}
      </FormField>

      <FormField
        id="description"
        label="Description"
        hint="A short paragraph at the top of the industry's page on the website."
        error={errors?.description}
      >
        {(props) => (
          <Textarea
            {...props}
            name="description"
            defaultValue={values.description}
            rows={4}
            maxLength={600}
          />
        )}
      </FormField>

      <FormField id="icon" label="Icon" error={errors?.icon}>
        {(props) => (
          <NativeSelect
            {...props}
            name="icon"
            defaultValue={values.icon}
            className="sm:w-72"
          >
            {Object.entries(INDUSTRY_ICONS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>

      <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
        <Label htmlFor="active" className="flex-col items-start gap-1">
          <span>Active</span>
          <span className="text-sm font-normal text-muted-foreground">
            Turn off to take it off the website. Its work types stay as they
            are.
          </span>
        </Label>
        <Switch id="active" name="active" defaultChecked={values.active} />
      </div>

      <ActionFeedback state={state} />
      <SubmitButton pending={pending}>
        {values.id ? "Save changes" : "Add industry"}
      </SubmitButton>
    </form>
  );
}
