import type { Tables } from "@/lib/supabase/database.types";

/**
 * An award's rules on a rate card (owner, 01/11/2026), as typed in the form:
 * blank means the card doesn't use that rule. Each key is the column it saves
 * to. Kept out of the form's client module so server pages can use it.
 */
export type AwardRuleValues = {
  overtime_after_hours: string;
  tier_hours: string;
  overtime_after_multiplier: string;
  saturday_after_multiplier: string;
  saturday_later_from: string;
  ordinary_from: string;
  ordinary_to: string;
  early_late_multiplier: string;
  early_late_starts_before: string;
  early_late_finishes_after: string;
  night_shift_multiplier: string;
  night_shift_finishes_by: string;
};

export const emptyAwardRules: AwardRuleValues = {
  overtime_after_hours: "",
  tier_hours: "2",
  overtime_after_multiplier: "",
  saturday_after_multiplier: "",
  saturday_later_from: "",
  ordinary_from: "",
  ordinary_to: "",
  early_late_multiplier: "",
  early_late_starts_before: "",
  early_late_finishes_after: "",
  night_shift_multiplier: "",
  night_shift_finishes_by: "",
};

/** A number from the database as typed ("7.60" → "7.6"), or blank. */
function numberText(value: number | string | null): string {
  return value === null ? "" : String(Number(value));
}

/** A time from the database ("07:00:00") as a time box shows it ("07:00"). */
function timeText(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

/** A saved card's award rules, ready for the form. */
export function awardRuleValuesFromRow(
  row: Pick<
    Tables<"rate_cards">,
    | "overtime_after_hours"
    | "tier_hours"
    | "overtime_after_multiplier"
    | "saturday_after_multiplier"
    | "saturday_later_from"
    | "ordinary_from"
    | "ordinary_to"
    | "early_late_multiplier"
    | "early_late_starts_before"
    | "early_late_finishes_after"
    | "night_shift_multiplier"
    | "night_shift_finishes_by"
  >,
): AwardRuleValues {
  return {
    overtime_after_hours: numberText(row.overtime_after_hours),
    tier_hours: numberText(row.tier_hours),
    overtime_after_multiplier: numberText(row.overtime_after_multiplier),
    saturday_after_multiplier: numberText(row.saturday_after_multiplier),
    saturday_later_from: timeText(row.saturday_later_from),
    ordinary_from: timeText(row.ordinary_from),
    ordinary_to: timeText(row.ordinary_to),
    early_late_multiplier: numberText(row.early_late_multiplier),
    early_late_starts_before: timeText(row.early_late_starts_before),
    early_late_finishes_after: timeText(row.early_late_finishes_after),
    night_shift_multiplier: numberText(row.night_shift_multiplier),
    night_shift_finishes_by: timeText(row.night_shift_finishes_by),
  };
}
