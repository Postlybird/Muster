import { Percent, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { formatCalendarDate, formatCents } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { businessName } from "@/server/businesses";
import { getAllSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Bill rules" };

export default async function BillRulesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: rules }, settings] = await Promise.all([
    supabase
      .from("bill_rate_rules")
      .select("*, categories(name), businesses(legal_name, trading_name)")
      .is("archived_at", null)
      .order("effective_from", { ascending: false }),
    getAllSettings(),
  ]);

  const onCosts = settings.on_costs_pct;
  const onCostTotal =
    onCosts.super +
    onCosts.workers_comp +
    onCosts.payroll_tax +
    onCosts.insurance;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-muted-foreground">
          By default a business is billed pay plus on-costs ({onCostTotal}% in{" "}
          <Link href="/admin/settings" className="underline">
            settings
          </Link>
          ) plus a {settings.margin_pct}% margin. A rule here overrides that: a
          different margin, or fixed bill rates. The most specific rule wins: a
          business&apos;s rule for the category, then its rule for all
          categories, then the category&apos;s standard rule.
        </p>
        <Button asChild>
          <Link href="/admin/rates/bill-rules/new">
            <Plus aria-hidden />
            Add bill rule
          </Link>
        </Button>
      </div>

      {(rules ?? []).length === 0 ? (
        <EmptyState
          icon={Percent}
          title="No bill rules yet"
          description="Every category uses the default margin."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Applies to</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Until</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rules ?? []).map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <Link
                    href={`/admin/rates/bill-rules/${rule.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {rule.categories?.name ?? "All categories"}
                  </Link>
                </TableCell>
                <TableCell>
                  {rule.businesses
                    ? businessName(rule.businesses)
                    : "Every business"}
                </TableCell>
                <TableCell>
                  {rule.method === "markup" ? (
                    <Badge variant="info">
                      {Number(rule.margin_pct)}% margin
                    </Badge>
                  ) : (
                    <Badge variant="neutral">
                      Fixed: {formatCents(rule.fixed_ordinary_cents ?? 0)}/hr
                      ordinary
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{formatCalendarDate(rule.effective_from)}</TableCell>
                <TableCell>
                  {rule.effective_to
                    ? formatCalendarDate(rule.effective_to)
                    : "No end date"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
