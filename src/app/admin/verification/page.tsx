import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { formatCalendarDate, formatDate } from "@/lib/format";
import { loadVerificationQueue, type QueueEntry } from "@/server/verification";

export const metadata: Metadata = { title: "Verification" };

function QueueTable({
  entries,
  dateLabel,
}: {
  entries: QueueEntry[];
  dateLabel: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Worker</TableHead>
          <TableHead>Waiting for</TableHead>
          <TableHead>{dateLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.workerId}>
            <TableCell className="font-medium">
              <Link
                href={`/admin/workers/${entry.workerId}`}
                className="underline-offset-4 hover:underline"
              >
                {entry.name}
              </Link>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {entry.waiting.map((item) => (
                  <Badge
                    key={item}
                    variant={item === "Ready to activate" ? "success" : "info"}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {entry.submittedAt ? formatDate(entry.submittedAt) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function VerificationPage() {
  await requireAdmin();
  const { newWorkers, updates, rechecks } = await loadVerificationQueue();
  const nothing =
    newWorkers.length === 0 && updates.length === 0 && rechecks.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Verification"
        description="Check documents beside the details entered, then approve or reject. Oldest first."
      />

      {nothing ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing to check"
          description="New workers and updated documents will appear here."
        />
      ) : null}

      {newWorkers.length > 0 ? (
        <section aria-labelledby="new-workers" className="space-y-3">
          <h2 id="new-workers" className="text-lg font-semibold">
            New workers ({newWorkers.length})
          </h2>
          <QueueTable entries={newWorkers} dateLabel="Submitted" />
        </section>
      ) : null}

      {updates.length > 0 ? (
        <section aria-labelledby="updates" className="space-y-3">
          <h2 id="updates" className="text-lg font-semibold">
            Updates from current workers ({updates.length})
          </h2>
          <QueueTable entries={updates} dateLabel="First submitted" />
        </section>
      ) : null}

      {rechecks.length > 0 ? (
        <section aria-labelledby="rechecks" className="space-y-3">
          <h2 id="rechecks" className="text-lg font-semibold">
            Visa re-checks due ({rechecks.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Check VEVO again and record the result on the worker&apos;s page.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Visa</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rechecks.map((entry) => (
                <TableRow key={entry.workerId}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/workers/${entry.workerId}#right-to-work`}
                      className="underline-offset-4 hover:underline"
                    >
                      {entry.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {entry.subclass
                      ? `Subclass ${entry.subclass}`
                      : entry.basis}
                  </TableCell>
                  <TableCell>{formatCalendarDate(entry.due)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}
    </div>
  );
}
