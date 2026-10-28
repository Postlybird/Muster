"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DAY_TYPES,
  dayTypeLabels,
  hourlyPayCents,
  type DayType,
} from "@/domain/rates";
import { formatCents } from "@/lib/format";

import { saveRateCard } from "../actions";

export type RateCardFormValues = {
  id: string | null;
  category_id: string;
  level: number;
  base_rate: string;
  multipliers: Record<DayType, number>;
  effective_from: string;
  effective_to: string;
  checked_by: string;
  checked_on: string;
  notes: string;
};

export function RateCardForm({
  values,
  categories,
}: {
  values: RateCardFormValues;
  categories: { id: string; name: string }[];
}) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    saveRateCard.bind(null, values.id),
  );
  const [base, setBase] = useState(values.base_rate);
  const [multipliers, setMultipliers] = useState(values.multipliers);

  const baseCents = Math.round(Number(base.replace(/[$,\s]/g, "")) * 100);
  const preview = (day: DayType) =>
    Number.isFinite(baseCents) && baseCents > 0
      ? formatCents(
          hourlyPayCents({ baseRateCents: baseCents, multipliers }, day),
        )
      : "—";

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-6">
      <div className="grid gap-6 sm:grid-cols-3">
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
              <SelectTrigger {...props}>
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
        <FormField id="level" label="Level" error={fieldErrors?.level}>
          {(props) => (
            <Input
              {...props}
              name="level"
              type="number"
              min="1"
              max="10"
              defaultValue={values.level}
            />
          )}
        </FormField>
        <FormField
          id="base_rate"
          label="Base rate"
          hint="Dollars per hour, excluding casual loading."
          error={fieldErrors?.base_rate}
        >
          {(props) => (
            <Input
              {...props}
              name="base_rate"
              inputMode="decimal"
              value={base}
              onChange={(event) => setBase(event.target.value)}
            />
          )}
        </FormField>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Multipliers (including casual loading)
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {DAY_TYPES.map((day) => (
            <FormField
              key={day}
              id={`${day}_multiplier`}
              label={dayTypeLabels[day]}
              hint={`${preview(day)} an hour`}
              error={fieldErrors?.[`${day}_multiplier`]}
            >
              {(props) => (
                <Input
                  {...props}
                  name={`${day}_multiplier`}
                  type="number"
                  step="0.001"
                  min="0.5"
                  max="5"
                  inputMode="decimal"
                  value={multipliers[day]}
                  onChange={(event) =>
                    setMultipliers((m) => ({
                      ...m,
                      [day]: Number(event.target.value),
                    }))
                  }
                />
              )}
            </FormField>
          ))}
        </div>
      </fieldset>

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
        <FormField
          id="checked_by"
          label="Checked by"
          hint="The payroll professional who checked these rates."
          error={fieldErrors?.checked_by}
        >
          {(props) => (
            <Input
              {...props}
              name="checked_by"
              defaultValue={values.checked_by}
            />
          )}
        </FormField>
        <FormField
          id="checked_on"
          label="Checked on"
          error={fieldErrors?.checked_on}
        >
          {(props) => (
            <Input
              {...props}
              name="checked_on"
              type="date"
              defaultValue={values.checked_on}
            />
          )}
        </FormField>
      </div>

      <FormField
        id="notes"
        label="Notes"
        hint="E.g. the award and clause."
        error={fieldErrors?.notes}
      >
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
        {values.id ? "Save changes" : "Add rate card"}
      </SubmitButton>
    </form>
  );
}
