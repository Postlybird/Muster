import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormField } from "@/components/forms/form-field";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  boardGroup,
  needsAttention,
  type BoardGroup,
} from "@/domain/shift-board";
import { requireAdmin } from "@/lib/auth";
import { shiftSummary } from "@/lib/job-format";
import { choiceParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shift board" };

const WINDOWS = {
  "24h": { label: "24 hours", hours: 24 },
  "7d": { label: "7 days", hours: 24 * 7 },
  "30d": { label: "30 days", hours: 24 * 30 },
} as const;
type Window = keyof typeof WINDOWS;

type Row = {
  shift_id: string;
  business_id: string;
  business_name: string;
  suburb: string | null;
  category_name: string | null;
  job_type: string;
  starts_at: string;
  ends_at: string;
  headcount: number;
  booked: number;
  applicants: number;
  arrived: number;
  startsAt: Date;
};

const SECTIONS: { group: BoardGroup; title: string; empty: string }[] = [
  {
    group: "in_progress",
    title: "Under way",
    empty: "No shifts are under way.",
  },
  {
    group: "needs_workers",
    title: "Needs workers",
    empty: "Every shift in this period is fully booked.",
  },
  {
    group: "filled",
    title: "Filled",
    empty: "No shifts are fully booked yet.",
  },
];

function workers(row: Row, group: BoardGroup): string {
  const short = row.headcount - row.booked;
  if (group === "in_progress") {
    return `${row.arrived} of ${row.booked} on site${short > 0 ? `, ${short} short` : ""}`;
  }
  const booked = `${row.booked} of ${row.headcount} booked`;
  return row.applicants > 0 ? `${booked}, ${row.applicants} applied` : booked;
}

function BoardTable({
  rows,
  group,
  now,
}: {
  rows: Row[];
  group: BoardGroup;
  now: Date;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Work</TableHead>
          <TableHead>Business</TableHead>
          <TableHead>Suburb</TableHead>
          <TableHead>Workers</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const attention = needsAttention(row, now);
          return (
            <TableRow
              key={row.shift_id}
              className={cn(attention && "bg-danger-soft hover:bg-danger-soft")}
            >
              <TableCell className="whitespace-nowrap">
                {shiftSummary([row])}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  {row.category_name ?? "Work"}
                  {row.job_type === "urgent" ? (
                    <Badge variant="warning">Urgent</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/businesses/${row.business_id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {row.business_name}
                </Link>
              </TableCell>
              <TableCell>{row.suburb ?? "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  {workers(row, group)}
                  {attention ? (
                    <Badge variant="danger">Starts within 24 hours</Badge>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/**
 * Posted shifts that haven't finished (brief §6): under way, still needing
 * workers, and filled. Unfilled shifts starting within 24 hours show red.
 */
export default async function ShiftBoardPage({
  searchParams,
}: PageProps<"/admin/shifts">) {
  await requireAdmin();
  const params = await searchParams;
  const window: Window =
    choiceParam(params, "next", Object.keys(WINDOWS) as Window[]) ?? "7d";
  const now = new Date();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_shift_board", {
    p_from: now.toISOString(),
    p_to: new Date(
      now.getTime() + WINDOWS[window].hours * 3_600_000,
    ).toISOString(),
  });
  if (error) throw new Error(`Couldn't load shifts: ${error.message}`);
  const rows: Row[] = (data ?? []).map((row) => ({
    ...row,
    startsAt: new Date(row.starts_at),
  }));
  const attention = rows.filter((row) => needsAttention(row, now)).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Shift board"
        description="Posted shifts that haven't finished. Shifts starting within 24 hours that aren't fully booked show red."
      />

      <form
        key={window}
        action="/admin/shifts"
        className="flex flex-wrap items-end gap-3"
      >
        <FormField id="next" label="Shifts starting in the next">
          {(field) => (
            <NativeSelect
              {...field}
              name="next"
              defaultValue={window}
              className="w-48"
            >
              {Object.entries(WINDOWS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <Button type="submit">Show shifts</Button>
      </form>

      {attention > 0 ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>
            {attention === 1
              ? "1 shift starting within 24 hours isn't fully booked."
              : `${attention} shifts starting within 24 hours aren't fully booked.`}
          </AlertDescription>
        </Alert>
      ) : null}

      {SECTIONS.map(({ group, title, empty }) => {
        const inGroup = rows.filter((row) => boardGroup(row, now) === group);
        return (
          <section
            key={group}
            aria-labelledby={`board-${group}`}
            className="space-y-3"
          >
            <h2 id={`board-${group}`} className="text-lg font-semibold">
              {title} ({inGroup.length})
            </h2>
            {inGroup.length > 0 ? (
              <BoardTable rows={inGroup} group={group} now={now} />
            ) : (
              <p className="text-sm text-muted-foreground">{empty}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
