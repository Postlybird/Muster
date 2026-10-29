import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ListPages } from "@/components/admin/list-pages";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/forms/form-field";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status/status-badge";
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
import { requireAdmin } from "@/lib/auth";
import { formatCalendarDate } from "@/lib/format";
import {
  choiceParam,
  idParam,
  listHref,
  pageParam,
  textParam,
} from "@/lib/search-params";
import { workerStatuses, type WorkerStatus } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { workerName } from "@/lib/timesheet-format";
import { getAllSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Workers" };

const PAGE_SIZE = 50;
const STATUSES = Object.keys(workerStatuses) as WorkerStatus[];

/** Every worker, filtered to find who you need (brief §6). */
export default async function AdminWorkersPage({
  searchParams,
}: PageProps<"/admin/workers">) {
  await requireAdmin();
  const params = await searchParams;
  const filters = {
    q: textParam(params, "q"),
    status: choiceParam(params, "status", STATUSES),
    category: idParam(params, "category"),
    ticket: idParam(params, "ticket"),
    suburb: textParam(params, "suburb"),
    expiring: textParam(params, "expiring") === "on",
  };
  const page = pageParam(params);
  const settings = await getAllSettings();
  const expiringDays = Math.max(...settings.expiry_warning_days);

  const supabase = await createClient();
  const [{ data: rows, error }, { data: categories }, { data: tickets }] =
    await Promise.all([
      supabase.rpc("admin_worker_list", {
        p_search: filters.q || undefined,
        p_status: filters.status,
        p_category_id: filters.category,
        p_credential_type_id: filters.ticket,
        p_suburb: filters.suburb || undefined,
        p_expiring_within_days: filters.expiring ? expiringDays : undefined,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
      }),
      supabase
        .from("categories")
        .select("id, name")
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("credential_types")
        .select("id, name")
        .is("archived_at", null)
        .order("sort_order")
        .order("name"),
    ]);
  if (error) throw new Error(`Couldn't load workers: ${error.message}`);
  const workers = rows ?? [];
  const total = workers[0]?.total_count ?? 0;
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workers"
        description="Everyone who has signed up to work. Filter to find who you need."
      />

      {/* Keyed by the filters, so the fields show them after a link changes them. */}
      <form
        key={JSON.stringify(filters)}
        action="/admin/workers"
        role="search"
        aria-label="Filter workers"
        className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <FormField id="q" label="Name, mobile or email">
          {(field) => (
            <Input {...field} name="q" type="search" defaultValue={filters.q} />
          )}
        </FormField>
        <FormField id="status" label="Status">
          {(field) => (
            <NativeSelect
              {...field}
              name="status"
              defaultValue={filters.status ?? ""}
            >
              <option value="">Any status</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {workerStatuses[status].label}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="category" label="Work type">
          {(field) => (
            <NativeSelect
              {...field}
              name="category"
              defaultValue={filters.category ?? ""}
            >
              <option value="">Any work type</option>
              {(categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="ticket" label="Verified ticket">
          {(field) => (
            <NativeSelect
              {...field}
              name="ticket"
              defaultValue={filters.ticket ?? ""}
            >
              <option value="">Any ticket</option>
              {(tickets ?? []).map((ticket) => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="suburb" label="Suburb or postcode">
          {(field) => (
            <Input {...field} name="suburb" defaultValue={filters.suburb} />
          )}
        </FormField>
        <div className="flex min-h-11 items-center gap-3 sm:self-end">
          <Checkbox
            id="expiring"
            name="expiring"
            defaultChecked={filters.expiring}
          />
          <Label htmlFor="expiring">
            Ticket or visa expiring within {expiringDays} days
          </Label>
        </div>
        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-3">
          <Button type="submit">Show workers</Button>
          {filtered ? (
            <Button asChild variant="ghost">
              <Link href="/admin/workers">Clear filters</Link>
            </Button>
          ) : null}
        </div>
      </form>

      {workers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filtered ? "No workers match" : "No workers yet"}
          description={
            filtered
              ? "Try fewer filters."
              : "Workers appear here once they sign up."
          }
        />
      ) : (
        <section aria-labelledby="results" className="space-y-3">
          <h2 id="results" className="text-lg font-semibold">
            {total === 1 ? "1 worker" : `${total} workers`}
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Suburb</TableHead>
                <TableHead>Work types</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Reliability</TableHead>
                <TableHead>Shifts</TableHead>
                <TableHead>Next to expire</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => (
                <TableRow key={worker.worker_id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/workers/${worker.worker_id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {worker.preferred_name || worker.legal_first_name
                        ? workerName(worker)
                        : "No name yet"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={workerStatuses[worker.status]} />
                  </TableCell>
                  <TableCell>{worker.home_suburb ?? "—"}</TableCell>
                  <TableCell>
                    {worker.categories.length > 0
                      ? worker.categories.join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {worker.rating_avg === null
                      ? "—"
                      : Number(worker.rating_avg).toFixed(1)}
                  </TableCell>
                  <TableCell>
                    {worker.reliability_score === null
                      ? "New"
                      : `${Math.round(Number(worker.reliability_score))}%`}
                  </TableCell>
                  <TableCell>{worker.shifts_completed}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {worker.next_expiry
                      ? `${worker.next_expiry_what}, ${formatCalendarDate(worker.next_expiry)}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPages
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            href={(to) => listHref("/admin/workers", params, { page: to })}
          />
        </section>
      )}
    </div>
  );
}
