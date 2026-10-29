import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/status/status-badge";
import type { StatusInfo } from "@/lib/statuses";

export type ChecklistItem = {
  title: string;
  status: StatusInfo;
  /** A rejection reason or other detail. */
  detail?: string | null;
  href?: string;
  action?: string;
};

/** The worker's verification checklist: each check, its status and what to do. */
export function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {items.map((item) => (
        <li key={item.title} className="space-y-1 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{item.title}</span>
            <StatusBadge status={item.status} />
          </div>
          {item.detail ? <p className="text-sm">{item.detail}</p> : null}
          <p className="text-sm text-muted-foreground">{item.status.next}</p>
          {item.href && item.action ? (
            <Link
              href={item.href}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {item.action}
              <span className="sr-only">: {item.title}</span>
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
