import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Day, month and year boxes, for dates people know by heart (date of birth).
 * Faster than a date picker that starts at today. Sends `${name}_day`,
 * `${name}_month` and `${name}_year`.
 */
export function DateParts({
  id,
  name,
  legend,
  hint,
  error,
  defaultValue,
  disabled,
  autoCompletePrefix,
}: {
  id: string;
  name: string;
  legend: string;
  hint?: string;
  error?: string[];
  /** yyyy-mm-dd */
  defaultValue?: string | null;
  disabled?: boolean;
  /** "bday" turns on birthday autofill. */
  autoCompletePrefix?: "bday";
}) {
  const [year = "", month = "", day = ""] = defaultValue?.split("-") ?? [];
  const message = error?.[0];
  const describedBy =
    [message ? `${id}-error` : null, hint ? `${id}-hint` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const parts = [
    { key: "day", label: "Day", value: day, width: "w-16", max: 2 },
    { key: "month", label: "Month", value: month, width: "w-16", max: 2 },
    { key: "year", label: "Year", value: year, width: "w-24", max: 4 },
  ] as const;

  return (
    <fieldset className="space-y-2" aria-describedby={describedBy}>
      <legend className="text-sm leading-none font-medium">{legend}</legend>
      {hint ? (
        <p id={`${id}-hint`} className="pt-2 text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div className="flex gap-3 pt-1">
        {parts.map((part) => (
          <div key={part.key} className="space-y-1.5">
            <Label
              htmlFor={`${id}-${part.key}`}
              className="font-normal text-muted-foreground"
            >
              {part.label}
            </Label>
            <Input
              id={`${id}-${part.key}`}
              name={`${name}_${part.key}`}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={part.max}
              defaultValue={part.value.replace(/^0(?=\d)/, "")}
              className={part.width}
              disabled={disabled}
              aria-invalid={message ? true : undefined}
              autoComplete={
                autoCompletePrefix ? `${autoCompletePrefix}-${part.key}` : "off"
              }
            />
          </div>
        ))}
      </div>
      {message ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}
