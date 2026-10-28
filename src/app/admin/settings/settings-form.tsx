"use client";

import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { useServerForm } from "@/components/forms/use-server-form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SettingGroup, SettingInput } from "@/config/settings";

import { saveSettingsGroup } from "./actions";

export type SettingRow = {
  key: string;
  label: string;
  help: string;
  input: SettingInput;
  value: unknown;
  /** A placeholder nobody has confirmed (saved) yet. */
  unconfirmed: boolean;
  isPublic: boolean;
};

const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Unit({ children }: { children?: string }) {
  return children ? (
    <span className="text-sm text-muted-foreground">{children}</span>
  ) : null;
}

function SettingInputControl({
  row,
  describedBy,
  invalid,
}: {
  row: SettingRow;
  describedBy: string;
  invalid: boolean;
}) {
  const { input, key, value } = row;
  const aria = {
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
  };

  switch (input.kind) {
    case "number":
      return (
        <div className="flex items-center gap-2">
          <Input
            id={key}
            name={key}
            type="number"
            inputMode="decimal"
            step={input.step ?? 1}
            min={input.min}
            max={input.max}
            defaultValue={value as number}
            className="w-32"
            {...aria}
          />
          <Unit>{input.unit}</Unit>
        </div>
      );
    case "boolean":
      return (
        <Switch
          id={key}
          name={key}
          defaultChecked={value as boolean}
          {...aria}
        />
      );
    case "weekday":
      return (
        <Select name={key} defaultValue={value as string}>
          <SelectTrigger id={key} className="w-48" {...aria}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {weekdays.map((day) => (
              <SelectItem key={day} value={day}>
                {capitalise(day)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "number_list":
      return (
        <div className="flex items-center gap-2">
          <Input
            id={key}
            name={key}
            defaultValue={(value as number[]).join(", ")}
            className="w-40"
            {...aria}
          />
          <Unit>{input.unit}</Unit>
        </div>
      );
    case "time_range": {
      const range = value as { start: string; end: string };
      return (
        <fieldset className="flex flex-wrap items-center gap-2" {...aria}>
          <legend className="sr-only">{row.label}</legend>
          <Label htmlFor={`${key}.start`} className="font-normal">
            From
          </Label>
          <Input
            id={`${key}.start`}
            name={`${key}.start`}
            type="time"
            defaultValue={range.start}
            className="w-32"
          />
          <Label htmlFor={`${key}.end`} className="font-normal">
            to
          </Label>
          <Input
            id={`${key}.end`}
            name={`${key}.end`}
            type="time"
            defaultValue={range.end}
            className="w-32"
          />
        </fieldset>
      );
    }
    case "percent_fields": {
      const values = value as Record<string, number>;
      return (
        <fieldset className="grid gap-3 sm:grid-cols-2" {...aria}>
          <legend className="sr-only">{row.label}</legend>
          {input.fields.map((field) => (
            <div key={field.key} className="flex items-center gap-2">
              <Label
                htmlFor={`${key}.${field.key}`}
                className="w-28 font-normal"
              >
                {field.label}
              </Label>
              <Input
                id={`${key}.${field.key}`}
                name={`${key}.${field.key}`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="100"
                defaultValue={values[field.key]}
                className="w-28"
              />
              <Unit>%</Unit>
            </div>
          ))}
        </fieldset>
      );
    }
  }
}

export function SettingsGroupForm({
  group,
  title,
  rows,
}: {
  group: SettingGroup;
  title: string;
  rows: SettingRow[];
}) {
  const { state, onSubmit, pending, fieldErrors } = useServerForm(
    saveSettingsGroup.bind(null, group),
  );

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-labelledby={`group-${group}`}
      className="space-y-4 rounded-xl border p-4 sm:p-6"
    >
      <h2 id={`group-${group}`} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="divide-y">
        {rows.map((row) => {
          const error = fieldErrors?.[row.key]?.[0];
          const describedBy = `${row.key}-help${error ? ` ${row.key}-error` : ""}`;
          return (
            <div
              key={row.key}
              className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-6"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {row.input.kind === "time_range" ||
                  row.input.kind === "percent_fields" ? (
                    <span className="text-sm font-medium">{row.label}</span>
                  ) : (
                    <Label htmlFor={row.key}>{row.label}</Label>
                  )}
                  {row.unconfirmed ? (
                    <Badge variant="warning">Placeholder</Badge>
                  ) : null}
                  {row.isPublic ? null : (
                    <Badge variant="neutral">Admin only</Badge>
                  )}
                </div>
                <p
                  id={`${row.key}-help`}
                  className="text-sm text-muted-foreground"
                >
                  {row.help}
                </p>
              </div>
              <div className="space-y-1">
                <SettingInputControl
                  row={row}
                  describedBy={describedBy}
                  invalid={!!error}
                />
                {error ? (
                  <p
                    id={`${row.key}-error`}
                    className="text-sm text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <ActionFeedback state={state} />
      <SubmitButton pending={pending}>Save {title.toLowerCase()}</SubmitButton>
    </form>
  );
}
