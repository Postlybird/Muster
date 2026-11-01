"use client";

import { useState } from "react";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CORE_DAY_TYPES,
  dayTypeLabels,
  hourlyPayCents,
  type CoreDayType,
  type DayType,
  type Multipliers,
} from "@/domain/rates";
import { formatCents } from "@/lib/format";

import { saveRateCard } from "../actions";
import type { AwardRuleValues } from "./award-rule-values";

export type RateCardFormValues = {
  id: string | null;
  /** Empty for the standard card. */
  business_id: string;
  category_id: string;
  level: number;
  base_rate: string;
  multipliers: Record<CoreDayType, number>;
  award: AwardRuleValues;
  effective_from: string;
  effective_to: string;
  checked_by: string;
  checked_on: string;
  notes: string;
};

function MultiplierInput({
  name,
  value,
  onChange,
  ...props
}: {
  name: string;
  value: string | number;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<"input">, "onChange" | "value">) {
  return (
    <Input
      {...props}
      name={name}
      type="number"
      step="0.001"
      min="0.5"
      max="5"
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function RateCardForm({
  values,
  categories,
  businesses,
}: {
  values: RateCardFormValues;
  categories: { id: string; name: string }[];
  businesses: { id: string; name: string }[];
}) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    saveRateCard.bind(null, values.id),
  );
  const [base, setBase] = useState(values.base_rate);
  const [multipliers, setMultipliers] = useState(values.multipliers);
  const [award, setAward] = useState(values.award);

  const baseCents = Math.round(Number(base.replace(/[$,\s]/g, "")) * 100);
  const card: { baseRateCents: number; multipliers: Multipliers } = {
    baseRateCents: baseCents,
    multipliers: { ...multipliers },
  };
  for (const [type, field] of [
    ["overtime_after", "overtime_after_multiplier"],
    ["saturday_after", "saturday_after_multiplier"],
    ["early_late", "early_late_multiplier"],
    ["night_shift", "night_shift_multiplier"],
  ] as const) {
    const value = Number(award[field]);
    if (award[field] !== "" && Number.isFinite(value) && value > 0) {
      card.multipliers[type] = value;
    }
  }
  const preview = (day: DayType) =>
    Number.isFinite(baseCents) && baseCents > 0
      ? `${formatCents(hourlyPayCents(card, day))} an hour`
      : "—";
  const setRule = (field: keyof AwardRuleValues) => (value: string) =>
    setAward((current) => ({ ...current, [field]: value }));

  const timeField = (
    field: keyof AwardRuleValues,
    label: string,
    hint?: string,
  ) => (
    <FormField
      id={field}
      label={label}
      hint={hint}
      error={fieldErrors?.[field]}
    >
      {(props) => (
        <Input
          {...props}
          name={field}
          type="time"
          value={award[field]}
          onChange={(event) => setRule(field)(event.target.value)}
          className="w-36"
        />
      )}
    </FormField>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-6">
      <FormField
        id="business_id"
        label="Applies to"
        hint="A business's own card (for example under a 'same job, same pay' order) wins over the standard one."
        error={fieldErrors?.business_id}
      >
        {(props) => (
          <NativeSelect
            {...props}
            name="business_id"
            defaultValue={values.business_id}
            className="sm:w-96"
          >
            <option value="">Every business (standard rates)</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
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
          {CORE_DAY_TYPES.map((day) => (
            <FormField
              key={day}
              id={`${day}_multiplier`}
              label={dayTypeLabels[day]}
              hint={preview(day)}
              error={fieldErrors?.[`${day}_multiplier`]}
            >
              {(props) => (
                <MultiplierInput
                  {...props}
                  name={`${day}_multiplier`}
                  value={multipliers[day]}
                  onChange={(value) =>
                    setMultipliers((m) => ({ ...m, [day]: Number(value) }))
                  }
                />
              )}
            </FormField>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-5 rounded-xl border bg-card p-4">
        <legend className="px-1 text-sm font-medium">
          The award&apos;s rules
        </legend>
        <p className="text-sm text-muted-foreground">
          Leave a rule blank if the award doesn&apos;t have it. Each hour is
          paid at the highest rate that applies.
        </p>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Overtime</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="overtime_after_hours"
              label="Overtime starts after (hours a day)"
              hint="Blank: the standard setting."
              error={fieldErrors?.overtime_after_hours}
            >
              {(props) => (
                <Input
                  {...props}
                  name="overtime_after_hours"
                  type="number"
                  step="0.1"
                  min="1"
                  max="24"
                  inputMode="decimal"
                  value={award.overtime_after_hours}
                  onChange={(event) =>
                    setRule("overtime_after_hours")(event.target.value)
                  }
                />
              )}
            </FormField>
            <FormField
              id="tier_hours"
              label="Hours at the first overtime rate"
              hint="Then the later rate."
              error={fieldErrors?.tier_hours}
            >
              {(props) => (
                <Input
                  {...props}
                  name="tier_hours"
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="12"
                  inputMode="decimal"
                  value={award.tier_hours}
                  onChange={(event) =>
                    setRule("tier_hours")(event.target.value)
                  }
                />
              )}
            </FormField>
            <FormField
              id="overtime_after_multiplier"
              label="Later overtime multiplier"
              hint={
                award.overtime_after_multiplier
                  ? preview("overtime_after")
                  : "Blank: same as overtime."
              }
              error={fieldErrors?.overtime_after_multiplier}
            >
              {(props) => (
                <MultiplierInput
                  {...props}
                  name="overtime_after_multiplier"
                  value={award.overtime_after_multiplier}
                  onChange={setRule("overtime_after_multiplier")}
                />
              )}
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {timeField(
              "ordinary_from",
              "Ordinary hours from",
              "Monday to Friday. Time outside is overtime.",
            )}
            {timeField("ordinary_to", "Ordinary hours to")}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Saturday</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="saturday_after_multiplier"
              label="Later Saturday multiplier"
              hint={
                award.saturday_after_multiplier
                  ? `${preview("saturday_after")}, after the first ${award.tier_hours || "2"} hours`
                  : "Blank: Saturday is one rate."
              }
              error={fieldErrors?.saturday_after_multiplier}
            >
              {(props) => (
                <MultiplierInput
                  {...props}
                  name="saturday_after_multiplier"
                  value={award.saturday_after_multiplier}
                  onChange={setRule("saturday_after_multiplier")}
                />
              )}
            </FormField>
            {timeField(
              "saturday_later_from",
              "Later Saturday rate from",
              "Every hour from this time, e.g. 12:00.",
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            Early or late shift (the whole shift, Monday to Friday)
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="early_late_multiplier"
              label="Early or late shift multiplier"
              hint={
                award.early_late_multiplier
                  ? preview("early_late")
                  : "Blank: no loading."
              }
              error={fieldErrors?.early_late_multiplier}
            >
              {(props) => (
                <MultiplierInput
                  {...props}
                  name="early_late_multiplier"
                  value={award.early_late_multiplier}
                  onChange={setRule("early_late_multiplier")}
                />
              )}
            </FormField>
            {timeField("early_late_starts_before", "Early: starts before")}
            {timeField("early_late_finishes_after", "Late: finishes after")}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            Night shift (the whole shift, Monday to Friday)
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="night_shift_multiplier"
              label="Night shift multiplier"
              hint={
                award.night_shift_multiplier
                  ? preview("night_shift")
                  : "Blank: no loading."
              }
              error={fieldErrors?.night_shift_multiplier}
            >
              {(props) => (
                <MultiplierInput
                  {...props}
                  name="night_shift_multiplier"
                  value={award.night_shift_multiplier}
                  onChange={setRule("night_shift_multiplier")}
                />
              )}
            </FormField>
            {timeField(
              "night_shift_finishes_by",
              "Night: finishes after midnight and by",
            )}
          </div>
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
