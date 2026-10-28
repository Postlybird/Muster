import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ListPages } from "@/components/admin/list-pages";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/forms/form-field";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { addDays } from "@/domain/pay-runs";
import {
  actionLabel,
  actorLabel,
  changedFields,
  RECORD_LABELS,
  recordLabel,
} from "@/lib/audit-format";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, fromSydneyTime } from "@/lib/format";
import {
  choiceParam,
  idParam,
  listHref,
  pageParam,
  textParam,
} from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;
const KINDS = ["views", "changes"] as const;
const TABLES = Object.keys(RECORD_LABELS).sort((a, b) =>
  RECORD_LABELS[a]!.localeCompare(RECORD_LABELS[b]!),
);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function Details({
  action,
  before,
  after,
  context,
}: {
  action: string;
  before: unknown;
  after: unknown;
  context: unknown;
}) {
  if (action === "update") {
    const changes = changedFields(before, after);
    if (changes.length === 0) return null;
    return (
      <details>
        <summary className="cursor-pointer text-sm">
          {changes.length === 1 ? "1 change" : `${changes.length} changes`}
        </summary>
        <ul className="mt-2 space-y-1 text-sm [overflow-wrap:anywhere]">
          {changes.map((change) => (
            <li key={change.field}>
              <span className="font-medium">{change.field}:</span> {change.from}{" "}
              → {change.to}
            </li>
          ))}
        </ul>
      </details>
    );
  }
  if (action === "insert" || action === "delete") return null;
  const entries = Object.entries(
    context && typeof context === "object" ? context : {},
  );
  if (entries.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm [overflow-wrap:anywhere] text-muted-foreground">
      {entries.map(([key, value]) => (
        <li key={key}>
          {key.replaceAll("_", " ")}:{" "}
          {typeof value === "string" ? value : JSON.stringify(value)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Who viewed, changed or verified personal records, and when (brief §4.9).
 * Newest first; filtered by person, what was done, record and dates.
 */
export default async function AuditLogPage({
  searchParams,
}: PageProps<"/admin/audit">) {
  await requireAdmin();
  const params = await searchParams;
  const from = textParam(params, "from");
  const to = textParam(params, "to");
  const filters = {
    person: textParam(params, "person"),
    subject: idParam(params, "subject"),
    kind: choiceParam(params, "kind", KINDS),
    table: choiceParam(params, "table", TABLES),
    from: DATE.test(from) ? from : "",
    to: DATE.test(to) ? to : "",
    everything: textParam(params, "all") === "on",
  };
  const page = pageParam(params);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_audit_log", {
    p_person: filters.person || undefined,
    p_subject: filters.subject,
    // Jobs, shifts and settings only when asked for, or picked as the record.
    p_people_only: !filters.everything && !filters.table,
    p_kind: filters.kind,
    p_table: filters.table,
    p_from: filters.from
      ? fromSydneyTime(filters.from, "00:00").toISOString()
      : undefined,
    p_to: filters.to
      ? fromSydneyTime(addDays(filters.to, 1), "00:00").toISOString()
      : undefined,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(`Couldn't load the audit log: ${error.message}`);
  const entries = data ?? [];
  const total = entries[0]?.total_count ?? 0;
  const filtered = Object.values(filters).some(Boolean);
  const subjectName = filters.subject
    ? entries.find((entry) => entry.subject_profile_id === filters.subject)
        ?.subject_name
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Who viewed, changed or verified personal records, and when. Newest first."
      />

      {/* Keyed by the filters, so the fields show them after a link changes them. */}
      <form
        key={JSON.stringify(filters)}
        action="/admin/audit"
        role="search"
        aria-label="Filter the audit log"
        className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filters.subject ? (
          <input type="hidden" name="subject" value={filters.subject} />
        ) : null}
        <FormField id="person" label="Person (name, email or mobile)">
          {(field) => (
            <Input
              {...field}
              name="person"
              type="search"
              defaultValue={filters.person}
            />
          )}
        </FormField>
        <FormField id="kind" label="What was done">
          {(field) => (
            <NativeSelect
              {...field}
              name="kind"
              defaultValue={filters.kind ?? ""}
            >
              <option value="">Anything</option>
              <option value="views">Looked at documents or records</option>
              <option value="changes">Added or changed records</option>
            </NativeSelect>
          )}
        </FormField>
        <FormField id="table" label="Record">
          {(field) => (
            <NativeSelect
              {...field}
              name="table"
              defaultValue={filters.table ?? ""}
            >
              <option value="">Any record</option>
              {TABLES.map((table) => (
                <option key={table} value={table}>
                  {RECORD_LABELS[table]}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="from" label="From">
          {(field) => (
            <Input
              {...field}
              name="from"
              type="date"
              defaultValue={filters.from}
            />
          )}
        </FormField>
        <FormField id="to" label="To">
          {(field) => (
            <Input {...field} name="to" type="date" defaultValue={filters.to} />
          )}
        </FormField>
        <div className="flex min-h-11 items-center gap-3 sm:self-end">
          <Checkbox id="all" name="all" defaultChecked={filters.everything} />
          <Label htmlFor="all">Include jobs, shifts and settings</Label>
        </div>
        <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-3">
          <Button type="submit">Show entries</Button>
          {filtered ? (
            <Button asChild variant="ghost">
              <Link href="/admin/audit">Clear filters</Link>
            </Button>
          ) : null}
        </div>
      </form>

      {filters.subject ? (
        <p className="text-sm">
          Only records about {subjectName ?? "one person"}.{" "}
          <Link
            href={listHref("/admin/audit", params, { subject: null })}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Show everyone
          </Link>
        </p>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nothing found"
          description={
            filtered
              ? "No entries match. Try fewer filters."
              : "Entries appear as people view and change records."
          }
        />
      ) : (
        <section aria-labelledby="entries" className="space-y-3">
          <h2 id="entries" className="text-lg font-semibold">
            {total === 1
              ? "1 entry"
              : `${total.toLocaleString("en-AU")} entries`}
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>What</TableHead>
                <TableHead>Whose</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="align-top">
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(entry.created_at)}
                  </TableCell>
                  <TableCell>
                    {actorLabel(entry.actor_name, entry.actor_role)}
                  </TableCell>
                  <TableCell>
                    {actionLabel(entry.action)}: {recordLabel(entry.table_name)}
                  </TableCell>
                  <TableCell>
                    {entry.subject_worker_id ? (
                      <Link
                        href={`/admin/workers/${entry.subject_worker_id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {entry.subject_name}
                      </Link>
                    ) : (
                      (entry.subject_name ?? "—")
                    )}
                  </TableCell>
                  <TableCell className="min-w-56">
                    <Details
                      action={entry.action}
                      before={entry.before}
                      after={entry.after}
                      context={entry.context}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPages
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            href={(to) => listHref("/admin/audit", params, { page: to })}
          />
        </section>
      )}
    </div>
  );
}
