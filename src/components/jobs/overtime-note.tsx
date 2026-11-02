import { Clock } from "lucide-react";

import { overtimeLine, type OvertimeFacts } from "@/lib/overtime-format";

/**
 * Overtime from a worker's other shifts with us on one shift (owner,
 * 02/11/2026): the business sees it before it books and after, and the
 * worker on their booked shift.
 */
export function OvertimeNote({
  facts,
  day,
  audience,
  when,
}: {
  facts: OvertimeFacts;
  /** The shift's day, as shown beside it. */
  day: string;
  audience: "business" | "worker";
  when: "would be" | "is";
}) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-highlight/15 p-2 text-sm">
      <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <span className="font-medium">Overtime {day}.</span>{" "}
        {overtimeLine(facts, audience, when)}
      </span>
    </p>
  );
}
