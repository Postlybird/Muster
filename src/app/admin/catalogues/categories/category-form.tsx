"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { saveCategory } from "../actions";

type Option = { id: string; name: string };

export type CategoryFormValues = {
  id: string | null;
  name: string;
  description: string;
  police_check_required: boolean;
  min_engagement_hours: number;
  default_level: number;
  workers_comp_pct: number | null;
  active: boolean;
  credential_type_ids: string[];
  ppe_item_ids: string[];
};

export function CategoryForm({
  values,
  tickets,
  ppe,
}: {
  values: CategoryFormValues;
  tickets: Option[];
  ppe: Option[];
}) {
  const {
    state,
    onSubmit,
    pending,
    fieldErrors: errors,
  } = useServerForm(saveCategory.bind(null, values.id));

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6">
      <FormField id="name" label="Name" error={errors?.name}>
        {(props) => (
          <Input {...props} name="name" defaultValue={values.name} required />
        )}
      </FormField>

      <FormField
        id="description"
        label="Description"
        hint="Shown to workers choosing their work types."
        error={errors?.description}
      >
        {(props) => (
          <Textarea
            {...props}
            name="description"
            defaultValue={values.description}
            rows={3}
          />
        )}
      </FormField>

      <div className="grid gap-6 sm:grid-cols-3">
        <FormField
          id="min_engagement_hours"
          label="Minimum engagement"
          hint="Hours. Paid and billed even for shorter shifts."
          error={errors?.min_engagement_hours}
        >
          {(props) => (
            <Input
              {...props}
              name="min_engagement_hours"
              type="number"
              step="0.5"
              min="0"
              max="12"
              defaultValue={values.min_engagement_hours}
              required
            />
          )}
        </FormField>
        <FormField
          id="default_level"
          label="Default level"
          hint="Pay level for new jobs."
          error={errors?.default_level}
        >
          {(props) => (
            <Input
              {...props}
              name="default_level"
              type="number"
              min="1"
              max="10"
              defaultValue={values.default_level}
              required
            />
          )}
        </FormField>
        <FormField
          id="workers_comp_pct"
          label="Workers' comp %"
          hint="Leave blank to use the default on-cost."
          error={errors?.workers_comp_pct}
        >
          {(props) => (
            <Input
              {...props}
              name="workers_comp_pct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={values.workers_comp_pct ?? ""}
            />
          )}
        </FormField>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Required tickets</legend>
        <p className="text-sm text-muted-foreground">
          Pre-filled on every job in this category. Businesses can add more per
          job.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center gap-3">
              <Checkbox
                id={`ticket-${ticket.id}`}
                name="credential_type_ids"
                value={ticket.id}
                defaultChecked={values.credential_type_ids.includes(ticket.id)}
              />
              <Label htmlFor={`ticket-${ticket.id}`} className="font-normal">
                {ticket.name}
              </Label>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Default PPE</legend>
        <p className="text-sm text-muted-foreground">
          Pre-ticked when posting work.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ppe.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Checkbox
                id={`ppe-${item.id}`}
                name="ppe_item_ids"
                value={item.id}
                defaultChecked={values.ppe_item_ids.includes(item.id)}
              />
              <Label htmlFor={`ppe-${item.id}`} className="font-normal">
                {item.name}
              </Label>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-4">
          <Label
            htmlFor="police_check_required"
            className="flex-col items-start gap-1"
          >
            <span>Police check required</span>
            <span className="text-sm font-normal text-muted-foreground">
              Workers need a National Police Check on file for this work.
            </span>
          </Label>
          <Switch
            id="police_check_required"
            name="police_check_required"
            defaultChecked={values.police_check_required}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="active" className="flex-col items-start gap-1">
            <span>Active</span>
            <span className="text-sm font-normal text-muted-foreground">
              Turn off to stop offering this category for new work.
            </span>
          </Label>
          <Switch id="active" name="active" defaultChecked={values.active} />
        </div>
      </div>

      <ActionFeedback state={state} />
      <SubmitButton pending={pending}>
        {values.id ? "Save changes" : "Add category"}
      </SubmitButton>
    </form>
  );
}
