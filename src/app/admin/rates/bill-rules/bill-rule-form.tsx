"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DAY_TYPES, dayTypeLabels, type DayType } from "@/domain/rates";

import { saveBillRule } from "../actions";

export type BillRuleFormValues = {
  id: string | null;
  category_id: string;
  method: "markup" | "fixed";
  margin_pct: string;
  fixed: Record<DayType, string>;
  effective_from: string;
  effective_to: string;
  notes: string;
};

export function BillRuleForm({
  values,
  categories,
}: {
  values: BillRuleFormValues;
  categories: { id: string; name: string }[];
}) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    saveBillRule.bind(null, values.id),
  );
  const [method, setMethod] = useState(values.method);

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-6">
      <FormField
        id="category_id"
        label="Work category"
        error={fieldErrors?.category_id}
      >
        {(props) => (
          <Select
            name="category_id"
            defaultValue={values.category_id || undefined}
          >
            <SelectTrigger {...props} className="sm:w-96">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          How the bill rate is worked out
        </legend>
        <RadioGroup
          name="method"
          value={method}
          onValueChange={(value) => setMethod(value as "markup" | "fixed")}
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem
              value="markup"
              id="method-markup"
              className="mt-0.5"
            />
            <Label
              htmlFor="method-markup"
              className="flex-col items-start gap-1"
            >
              <span>Pay plus on-costs, plus a margin</span>
              <span className="text-sm font-normal text-muted-foreground">
                Follows pay rate changes automatically.
              </span>
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <RadioGroupItem
              value="fixed"
              id="method-fixed"
              className="mt-0.5"
            />
            <Label
              htmlFor="method-fixed"
              className="flex-col items-start gap-1"
            >
              <span>Fixed bill rates</span>
              <span className="text-sm font-normal text-muted-foreground">
                The same dollar rates whatever the pay. Check the margin when
                pay rates change.
              </span>
            </Label>
          </div>
        </RadioGroup>
      </fieldset>

      {method === "markup" ? (
        <FormField
          id="margin_pct"
          label="Margin"
          hint="Percent on top of pay plus on-costs."
          error={fieldErrors?.margin_pct}
        >
          {(props) => (
            <Input
              {...props}
              name="margin_pct"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              defaultValue={values.margin_pct}
              className="w-40"
            />
          )}
        </FormField>
      ) : (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">
            Bill rates (dollars per hour, excluding GST)
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            {DAY_TYPES.map((day) => (
              <FormField
                key={day}
                id={`fixed_${day}`}
                label={dayTypeLabels[day]}
                error={fieldErrors?.[`fixed_${day}`]}
              >
                {(props) => (
                  <Input
                    {...props}
                    name={`fixed_${day}`}
                    inputMode="decimal"
                    defaultValue={values.fixed[day]}
                  />
                )}
              </FormField>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          id="effective_from"
          label="Applies from"
          error={fieldErrors?.effective_from}
        >
          {(props) => (
            <Input
              {...props}
              name="effective_from"
              type="date"
              defaultValue={values.effective_from}
            />
          )}
        </FormField>
        <FormField
          id="effective_to"
          label="Applies until"
          hint="Leave blank if it has no end date."
          error={fieldErrors?.effective_to}
        >
          {(props) => (
            <Input
              {...props}
              name="effective_to"
              type="date"
              defaultValue={values.effective_to}
            />
          )}
        </FormField>
      </div>

      <FormField id="notes" label="Notes" error={fieldErrors?.notes}>
        {(props) => (
          <Textarea
            {...props}
            name="notes"
            defaultValue={values.notes}
            rows={3}
          />
        )}
      </FormField>

      <ActionFeedback state={state} />
      <SubmitButton pending={pending}>
        {values.id ? "Save changes" : "Add bill rule"}
      </SubmitButton>
    </form>
  );
}
