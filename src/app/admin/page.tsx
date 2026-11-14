import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { addDays, lastFullWeek, runDayReached } from "@/domain/pay-runs";
import { payrollTaxWarning } from "@/domain/payroll-tax";
import { needsAttention } from "@/domain/shift-board";
import { requireAdmin } from "@/lib/auth";
import { formatDollars, fromSydneyTime, sydneyDateKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getAllSettings } from "@/server/settings";
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
  const today = sydneyDateKey(now);
  const week = lastFullWeek(today);
  const count = { count: "exact", head: true } as const;
  const [
    settings,
    { data: runs },
    { count: approvedLastWeek },
    board,
    { count: matters },
    { count: safety },
    { count: queries },
    { count: businesses },
    { count: overdue },
    verification,
  ] = await Promise.all([
    getAllSettings(),
    supabase
      .from("pay_runs")
      .select("period_end, pay_cents")
      .gte(
        "period_end",
        sydneyDateKey(new Date(now.getTime() - 365 * 86_400_000)),
      ),
    supabase
      .from("timesheets")
      .select("id", count)
      .in("status", ["approved", "auto_approved", "adjusted"])
      .gte("start_at", fromSydneyTime(week.start, "00:00").toISOString())
      .lt(
        "start_at",
        fromSydneyTime(addDays(week.end, 1), "00:00").toISOString(),
      ),
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
  // Last week's pay run waits for our check from the run day (owner,
  // 14/11/2026), unless it's issued automatically.
  const payRunToCheck =
    !settings.pay_run_automatic &&
    runDayReached(today, settings.weekly_run_day) &&
    !(runs ?? []).some((run) => run.period_end >= week.end) &&
    (approvedLastWeek ?? 0) > 0;

  const items: Item[] = [
    {
      title: "Pay run to check",
      count: payRunToCheck ? 1 : 0,
      description:
        "Last week's invoices and payroll file wait for you to check and issue.",
      href: "/admin/pay-runs",
      urgent: true,
    },
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
  // Payroll tax isn't in prices until wages near NSW's threshold (owner,
  // 14/11/2026), so the dashboard says when they do.
  const daysAgo = (days: number) =>
    sydneyDateKey(new Date(now.getTime() - days * 86_400_000));
  const paidSince = (date: string) =>
    (runs ?? [])
      .filter((run) => run.period_end >= date)
      .reduce((sum, run) => sum + run.pay_cents, 0);
  const payrollTax = payrollTaxWarning({
    yearPayCents: paidSince(daysAgo(365)),
    monthPayCents: paidSince(daysAgo(30)),
    thresholdCents: settings.payroll_tax_threshold * 100,
    superPct: settings.on_costs_pct.super,
  });
  const nothing = items.every((item) => item.count === 0) && !payrollTax;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="What needs attention today." />
      {payrollTax ? (
        <Alert variant={payrollTax.over ? "destructive" : "warning"}>
          <AlertDescription>
            {`Wages, with super, ${payrollTax.over ? "have passed" : "are nearing"} NSW's payroll tax threshold of ${formatDollars(settings.payroll_tax_threshold * 100)} a year (${formatDollars(payrollTax.monthThresholdCents)} for 30 days): ${formatDollars(payrollTax.yearCents)} in the last 12 months, and ${formatDollars(payrollTax.monthCents)} in the last 30 days. ${payrollTax.over ? "Register" : "Before you pass it, register"} with Revenue NSW, and add payroll tax to the on-costs in Settings → Pay and billing.`}
          </AlertDescription>
        </Alert>
      ) : null}
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
