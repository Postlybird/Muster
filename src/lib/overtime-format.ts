import { formatCents, formatHours } from "./format";

/** Overtime from a worker's other shifts, as src/server/overtime.ts works it out. */
export type OvertimeFacts = {
  minutes: number;
  reason: "day" | "week";
  priorMinutes: number;
  extraPayCents: number;
  extraBillCents: number;
};

/**
 * In plain words (owner, 02/11/2026), for the business before it books
 * ("would be"), after ("is"), or for the worker.
 */
export function overtimeLine(
  facts: OvertimeFacts,
  audience: "business" | "worker",
  when: "would be" | "is",
): string {
  const others = audience === "worker" ? "your" : "their";
  const extra =
    audience === "worker"
      ? `${formatCents(facts.extraPayCents)} more for you`
      : `${formatCents(facts.extraBillCents)} more, excluding GST`;
  return `With ${others} other shifts with us that ${facts.reason} (${formatHours(facts.priorMinutes)}), ${formatHours(facts.minutes)} of this shift ${when} overtime: about ${extra}.`;
}
