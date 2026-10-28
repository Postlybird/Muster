import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { needsAttention } from "@/domain/shift-board";
import { requireAdmin } from "@/lib/auth";
import { sydneyDateKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { loadVerificationQueue } from "@/server/verification";

export const metadata: Metadata = { title: "Admin dashboard" };

type Item = {
  title: string;
  count: number;
  description: string;
  href: string;
  /** Red when there's any: someone could be left short today. */
  urgent?: boolean;
};

function AttentionCard({ item }: { item: Item }) {
  const alarm = item.urgent && item.count > 0;
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "block h-full space-y-1 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50",
          alarm && "border-destructive/40 bg-danger-soft hover:bg-danger-soft",
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="text-3xl font-semibold">{item.count}</span>
          {alarm ? <Badge variant="danger">Needs action</Badge> : null}
        </span>
        <span className="block font-medium">{item.title}</span>
        <span className="block text-sm text-muted-foreground">
          {item.description}
        </span>
      </Link>
    </li>
  );
}

/** What needs an admin today (brief §6), each linking to where it's done. */
export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = await createClient();
  const now = new Date();
  const count = { count: "exact", head: true } as const;
  const [
    board,
    { count: matters },
    { count: safety },
    { count: queries },
    { count: businesses },
    { count: overdue },
    verification,
  ] = await Promise.all([
    supabase.rpc("admin_shift_board", {
      p_from: now.toISOString(),
      p_to: new Date(now.getTime() + 24 * 3_600_000).toISOString(),
    }),
    supabase
      .from("admin_flags")
      .select("id", count)
      .eq("status", "open")
      .not("kind", "in", "(timesheet_dispute,safety)"),
    supabase
      .from("admin_flags")
      .select("id", count)
      .eq("status", "open")
      .eq("kind", "safety"),
    supabase.from("timesheets").select("id", count).eq("status", "disputed"),
    supabase
      .from("businesses")
      .select("id", count)
      .eq("status", "pending")
      .is("archived_at", null),
    supabase
      .from("invoices")
      .select("id", count)
      .eq("status", "issued")
      .lt("due_on", sydneyDateKey(now)),
    loadVerificationQueue(),
  ]);
  const unfilled = (board.data ?? []).filter((shift) =>
    needsAttention({ ...shift, startsAt: new Date(shift.starts_at) }, now),
  ).length;

  const items: Item[] = [
    {
      title: "Unfilled shifts starting within 24 hours",
      count: unfilled,
      description: "Posted shifts that aren't fully booked yet.",
      href: "/admin/shifts?next=24h",
      urgent: true,
    },
    {
      title: "Open safety reports",
      count: safety ?? 0,
      description: "Reported from a site and not yet settled.",
      href: "/admin/queues",
      urgent: true,
    },
    {
      title: "Hours queried",
      count: queries ?? 0,
      description: "Timesheets for us to settle with both sides.",
      href: "/admin/queues",
    },
    {
      title: "Other matters in the queues",
      count: matters ?? 0,
      description: "No-shows, holds, bookings at risk and more.",
      href: "/admin/queues",
    },
    {
      title: "Workers to check",
      count: verification.newWorkers.length + verification.updates.length,
      description: "New sign-ups and updated documents.",
      href: "/admin/verification",
    },
    {
      title: "VEVO re-checks due",
      count: verification.rechecks.length,
      description: "Visa holders to check again within two weeks.",
      href: "/admin/verification",
    },
    {
      title: "Businesses to approve",
      count: businesses ?? 0,
      description: "Signed up and waiting for us.",
      href: "/admin/businesses?status=pending",
    },
    {
      title: "Overdue invoices",
      count: overdue ?? 0,
      description: "Past their due date and not marked paid.",
      href: "/admin/invoices",
    },
  ];
  const nothing = items.every((item) => item.count === 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="What needs attention today." />
      {nothing ? (
        <Alert variant="success">
          <AlertDescription>
            Nothing needs attention right now.
          </AlertDescription>
        </Alert>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <AttentionCard key={item.title} item={item} />
        ))}
      </ul>
    </div>
  );
}
