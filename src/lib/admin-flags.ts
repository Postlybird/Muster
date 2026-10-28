/**
 * Matters in the admin queues (admin_flags), and what an admin can decide
 * about each. settle_admin_flag() does it; hours queries are settled from
 * the timesheet instead.
 */

export const FLAG_KINDS: Readonly<Record<string, string>> = {
  no_show: "No-show",
  suspension: "Account on hold",
  possible_no_show: "Possible no-show",
  outside_site: "Away from the site",
  safety: "Safety report",
  work_limit: "Visa work limit",
  timesheet_dispute: "Hours queried",
  booking_at_risk: "Booking at risk",
};

export type FlagOutcome =
  "resolve" | "keep" | "arrived" | "no_show" | "excuse" | "lift" | "remove";

export type OutcomeChoice = {
  value: FlagOutcome;
  label: string;
  description: string;
};

/** The decisions open for a kind of matter. One choice means just a note. */
export function outcomesFor(kind: string): OutcomeChoice[] {
  switch (kind) {
    case "possible_no_show":
      return [
        {
          value: "arrived",
          label: "They were there",
          description:
            "Records their arrival at the start time, so their hours can come in.",
        },
        {
          value: "no_show",
          label: "They didn't come",
          description:
            "Records a no-show. It counts against their reliability and can put their account on hold. We tell them.",
        },
      ];
    case "no_show":
      return [
        {
          value: "keep",
          label: "The no-show stands",
          description: "It stays on their record.",
        },
        {
          value: "excuse",
          label: "Excuse it",
          description:
            "It no longer counts against their reliability or towards a hold. We tell them.",
        },
      ];
    case "suspension":
      return [
        {
          value: "lift",
          label: "Lift the hold",
          description: "They can take shifts again. We tell them.",
        },
        {
          value: "keep",
          label: "Keep the hold",
          description: "They still can't take new shifts.",
        },
      ];
    case "booking_at_risk":
      return [
        {
          value: "remove",
          label: "Take them off the shift",
          description:
            "The shift is offered to other workers. We send the worker your note and tell the business.",
        },
        {
          value: "keep",
          label: "Let it go ahead",
          description: "Nothing changes for the worker or the business.",
        },
      ];
    default:
      return [
        {
          value: "resolve",
          label: "Settled",
          description: "Record what was done.",
        },
      ];
  }
}

/** The outcome an admin chose, if it's one open for this kind of matter. */
export function chosenOutcome(
  kind: string,
  value: string,
): FlagOutcome | undefined {
  const choices = outcomesFor(kind);
  if (choices.length === 1) return choices[0]!.value;
  return choices.find((choice) => choice.value === value)?.value;
}
