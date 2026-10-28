import { getPayrollExporter } from "@/adapters/payroll";
import { payrollLines } from "@/lib/pay-runs";
import { createClient } from "@/lib/supabase/server";

/**
 * The run's payroll file (brief §4.8) for the payroll provider's timesheet
 * import. Only admins can read a run's lines (row level security).
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/admin/pay-runs/[id]/payroll">,
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const { data: run } = await supabase
    .from("pay_runs")
    .select("period_start, period_end")
    .eq("id", id)
    .maybeSingle();
  if (!run) return new Response("No such pay run.", { status: 404 });
  const { data: rows, error } = await supabase
    .from("pay_run_lines")
    .select(
      "kind, work_date, start_at, finish_at, break_minutes, hours, work_type, site_name, allowance_cents, pay_cents, workers(legal_first_name, legal_last_name, payroll_employee_id), businesses(legal_name, trading_name)",
    )
    .eq("pay_run_id", id);
  if (error) return new Response("Couldn't load the run.", { status: 502 });
  const lines = payrollLines(rows ?? []).sort(
    (a, b) =>
      a.workerName.localeCompare(b.workerName) ||
      a.date.localeCompare(b.date) ||
      a.start.localeCompare(b.start),
  );
  const file = getPayrollExporter().export(
    lines,
    `${run.period_start}_${run.period_end}`,
  );
  return new Response(file.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
