import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FLAG_KINDS } from "@/lib/admin-flags";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatDayShort } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { workerName } from "@/lib/timesheet-format";

export const metadata: Metadata = { title: "Queues" };

/**
 * What needs an admin (brief §6): timesheet queries to settle, then the
 * other open matters, each settled from its own page.
 */
export default async function QueuesPage({
  searchParams,
}: PageProps<"/admin/queues">) {
  await requireAdmin();
  const { resolved, settled: justSettled } = await searchParams;
  const supabase = await createClient();
  const [{ data: queries }, { data: flags }, { data: settled }] =
    await Promise.all([
      supabase
        .from("timesheets")
        .select(
          "id, disputed_at, business_note, worker_note, workers(preferred_name, legal_first_name, legal_last_name), jobs(sites(name), businesses(trading_name, legal_name)), assignments(shifts(starts_at))",
        )
        .eq("status", "disputed")
        .order("disputed_at"),
      supabase
        .from("admin_flags")
        .select(
          "id, kind, summary, created_at, workers(preferred_name, legal_first_name, legal_last_name), businesses(trading_name, legal_name)",
        )
        .eq("status", "open")
        .neq("kind", "timesheet_dispute")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("admin_flags")
        .select(
          "id, kind, resolution, resolved_at, workers(preferred_name, legal_first_name, legal_last_name)",
        )
        .eq("status", "resolved")
        .neq("kind", "timesheet_dispute")
        .order("resolved_at", { ascending: false, nullsFirst: false })
        .limit(20),
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Queues"
        description="Timesheet queries to settle, oldest first, and other matters to look at."
      />

      {resolved ? (
        <Alert variant="success">
          <AlertDescription>
            Settled. We&apos;ve told the worker and the business.
          </AlertDescription>
        </Alert>
      ) : null}
      {justSettled ? (
        <Alert variant="success">
          <AlertDescription>
            Settled. Anyone affected has been told.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="queries" className="space-y-3">
        <h2 id="queries" className="text-lg font-semibold">
          Timesheet queries ({queries?.length ?? 0})
        </h2>
        {queries?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Business and shift</TableHead>
                <TableHead>Queried</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queries.map((query) => (
                <TableRow key={query.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/timesheets/${query.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {query.workers ? workerName(query.workers) : "Worker"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {query.jobs?.businesses?.trading_name ??
                      query.jobs?.businesses?.legal_name}
                    , {query.jobs?.sites?.name}
                    {query.assignments?.shifts
                      ? `, ${formatDayShort(query.assignments.shifts.starts_at)}`
                      : ""}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {query.disputed_at
                      ? formatDateTime(query.disputed_at)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={Inbox}
            title="No queries"
            description="When a business or worker queries some hours, it shows here."
          />
        )}
      </section>

      <section aria-labelledby="flags" className="space-y-3">
        <h2 id="flags" className="text-lg font-semibold">
          Other open matters ({flags?.length ?? 0})
        </h2>
        <p className="text-sm text-muted-foreground">
          Newest first. Open one to settle it.
        </p>
        {flags?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>What</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell>
                    <Link
                      href={`/admin/queues/${flag.id}`}
                      className="block font-medium underline-offset-4 hover:underline"
                    >
                      {FLAG_KINDS[flag.kind] ?? flag.kind}
                    </Link>
                    <span className="block text-sm [overflow-wrap:anywhere] text-muted-foreground">
                      {flag.summary}
                    </span>
                  </TableCell>
                  <TableCell>
                    {[
                      flag.workers ? workerName(flag.workers) : null,
                      flag.businesses?.trading_name ??
                        flag.businesses?.legal_name ??
                        null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(flag.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm">Nothing open.</p>
        )}
      </section>

      {settled?.length ? (
        <section aria-labelledby="settled" className="space-y-3">
          <h2 id="settled" className="text-lg font-semibold">
            Recently settled
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>What</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Settled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settled.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell>
                    <Link
                      href={`/admin/queues/${flag.id}`}
                      className="block font-medium underline-offset-4 hover:underline"
                    >
                      {FLAG_KINDS[flag.kind] ?? flag.kind}
                    </Link>
                    <span className="block text-sm text-muted-foreground">
                      {flag.workers ? workerName(flag.workers) : null}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm [overflow-wrap:anywhere]">
                    {flag.resolution}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {flag.resolved_at ? formatDateTime(flag.resolved_at) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}
    </div>
  );
}
