import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

import type { StatusInfo } from "@/lib/statuses";

import { StatusBadge } from "./status-badge";

/** A status with its plain-words "what happens next" (brief §2). */
export function WhatsNext({
  status,
  title,
  detail,
  className,
}: {
  status: StatusInfo;
  title?: string;
  /** Extra context, e.g. a rejection reason. */
  detail?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 rounded-lg border bg-card p-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {title ? <span className="font-medium">{title}</span> : null}
        <StatusBadge status={status} />
      </div>
      {detail ? <div className="text-sm">{detail}</div> : null}
      <p className="flex gap-2 text-sm text-muted-foreground">
        <ArrowRight className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <span className="font-medium text-foreground">
            What happens next:{" "}
          </span>
          {status.next}
        </span>
      </p>
    </div>
  );
}
