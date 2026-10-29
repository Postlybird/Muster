import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCalendarDate } from "@/lib/format";
import type { TicketRow } from "@/server/tickets";

function describe(row: TicketRow): {
  badge: {
    label: string;
    variant: "neutral" | "info" | "success" | "warning" | "danger";
  };
  detail: string;
  action: string | null;
} {
  const { summary, type } = row;
  switch (summary.state) {
    case "missing":
      return {
        badge: { label: "Not added", variant: "neutral" },
        detail: "",
        action: "Add",
      };
    case "pending":
      return {
        badge: { label: "Being checked", variant: "info" },
        detail: summary.verifiedUntil
          ? `Renewal being checked. Your current one is valid until ${formatCalendarDate(summary.verifiedUntil)}.`
          : "We'll check it and text you when it's done.",
        action: "Edit",
      };
    case "rejected":
      return {
        badge: { label: "Needs fixing", variant: "danger" },
        detail: summary.reason ?? "Check the details and upload it again.",
        action: "Fix it",
      };
    case "verified":
      return {
        badge: {
          label: summary.expiringSoon ? "Expires soon" : "Verified",
          variant: summary.expiringSoon ? "warning" : "success",
        },
        detail: summary.validUntil
          ? `Valid until ${formatCalendarDate(summary.validUntil)}.`
          : type.has_expiry
            ? "Verified."
            : "Verified. Doesn't expire.",
        action: summary.expiringSoon ? "Add renewed ticket" : null,
      };
    case "expired":
      return {
        badge: { label: "Expired", variant: "warning" },
        detail: summary.expiredOn
          ? `Expired on ${formatCalendarDate(summary.expiredOn)}.`
          : "Expired.",
        action: "Add renewed ticket",
      };
  }
}

/** One ticket type and where the worker stands with it. */
export function TicketCard({ row }: { row: TicketRow }) {
  const { badge, detail, action } = describe(row);
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{row.type.name}</h3>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        {row.neededFor.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Needed for {row.neededFor.join(", ")}
          </p>
        ) : null}
        {detail ? <p className="text-sm">{detail}</p> : null}
      </div>
      {action ? (
        <Button asChild variant={action === "Add" ? "default" : "outline"}>
          <Link
            href={`/worker/onboarding/tickets/${row.type.code}`}
            aria-label={`${action}: ${row.type.name}`}
          >
            {action}
          </Link>
        </Button>
      ) : null}
    </li>
  );
}
