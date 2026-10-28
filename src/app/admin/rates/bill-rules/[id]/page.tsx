import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/forms/confirm-action";
import { Button } from "@/components/ui/button";
import { DAY_TYPES } from "@/domain/rates";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { businessName, businessOptions } from "@/server/businesses";

import { setRateArchived } from "../../actions";
import { BillRuleForm } from "../bill-rule-form";

export const metadata: Metadata = { title: "Edit bill rule" };

export default async function EditBillRulePage({
  params,
}: PageProps<"/admin/rates/bill-rules/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: rule }, { data: categories }, businesses] = await Promise.all([
    supabase
      .from("bill_rate_rules")
      .select("*, categories(name), businesses(legal_name, trading_name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name")
      .is("archived_at", null)
      .order("sort_order"),
    businessOptions(),
  ]);
  if (!rule) notFound();
  const archived = !!rule.archived_at;
  const dollars = (cents: number | null) =>
    cents === null ? "" : (cents / 100).toFixed(2);

  return (
    <div className="space-y-4">
      <Link
        href="/admin/rates/bill-rules"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All bill rules
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {rule.categories?.name ?? "All categories"}
          {rule.businesses ? `, ${businessName(rule.businesses)}` : ""}
          {archived ? " (archived)" : ""}
        </h2>
        <ConfirmAction
          trigger={
            <Button variant="outline" size="sm">
              {archived ? "Restore" : "Archive"}
            </Button>
          }
          title={
            archived ? "Restore this bill rule?" : "Archive this bill rule?"
          }
          description={
            archived
              ? "It will apply to new shifts again."
              : "New shifts go back to the default margin. Shifts already booked keep their bill rates."
          }
          confirmLabel={archived ? "Restore" : "Archive"}
          variant={archived ? "default" : "destructive"}
          action={setRateArchived.bind(
            null,
            "bill_rate_rules",
            rule.id,
            !archived,
          )}
        />
      </div>
      <BillRuleForm
        categories={categories ?? []}
        businesses={businesses}
        values={{
          id: rule.id,
          business_id: rule.business_id ?? "",
          category_id: rule.category_id ?? "",
          method: rule.method,
          margin_pct:
            rule.margin_pct === null ? "" : String(Number(rule.margin_pct)),
          fixed: Object.fromEntries(
            DAY_TYPES.map((day) => [day, dollars(rule[`fixed_${day}_cents`])]),
          ) as Record<(typeof DAY_TYPES)[number], string>,
          effective_from: rule.effective_from,
          effective_to: rule.effective_to ?? "",
          notes: rule.notes,
        }}
      />
    </div>
  );
}
