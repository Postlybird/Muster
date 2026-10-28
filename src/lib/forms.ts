import { z } from "zod";

/** What a form's Server Action returns (used with useActionState). */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export const idle: ActionState = { status: "idle" };

export function success(message: string): ActionState {
  return { status: "success", message };
}

export function failure(
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
): ActionState {
  return { status: "error", message, fieldErrors };
}

/** Turns a validation error into per-field messages. */
export function invalid(
  error: z.ZodError,
  message = "Check the highlighted fields.",
): ActionState {
  return failure(
    message,
    z.flattenError(error).fieldErrors as Record<string, string[]>,
  );
}

/** "Restoration labourer" → "restoration_labourer" (catalogue codes). */
export function toCode(name: string): string {
  const code = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "x_$1");
  return code || "item";
}

/** Reads a checkbox or switch from FormData ("on" when ticked). */
export function formBoolean(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true";
}

/** Empty strings become null; everything else is trimmed. */
export function optionalText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? null : text;
}

/** Dollars typed by a person ("27.5", "$27.50") to integer cents, or null. */
export function dollarsToCents(
  value: FormDataEntryValue | null,
): number | null {
  const text = typeof value === "string" ? value.replace(/[$,\s]/g, "") : "";
  if (text === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return Number.NaN;
  return Math.round(Number(text) * 100);
}

/** A number field that must be filled in (an empty box isn't zero). */
export function requiredNumber(message: string) {
  return z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? undefined : value,
    z.coerce.number({ error: message }),
  );
}
