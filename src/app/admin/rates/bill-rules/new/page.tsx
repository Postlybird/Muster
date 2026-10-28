import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { businessOptions } from "@/server/businesses";

import { BillRuleForm } from "../bill-rule-form";

export const metadata: Metadata = { title: "Add a bill rule" };

const blank = {
  ordinary: "",
  saturday: "",
  sunday: "",
  public_holiday: "",
  overtime: "",
  night: "",
};

export default async function NewBillRulePage({
  searchParams,
}: PageProps<"/admin/rates/bill-rules/new">) {
  await requireAdmin();
  const { business } = await searchParams;
  const supabase = await createClient();
  const [{ data: categories }, businesses] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .is("archived_at", null)
      .order("sort_order"),
    businessOptions(),
  ]);
  const forBusiness = businesses.find((item) => item.id === business);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        {forBusiness
          ? `Add a bill rule for ${forBusiness.name}`
          : "Add a bill rule"}
      </h2>
      <BillRuleForm
        categories={categories ?? []}
        businesses={businesses}
        values={{
          id: null,
          business_id: forBusiness?.id ?? "",
          category_id: "",
          method: "markup",
          margin_pct: "",
          fixed: blank,
          effective_from: "",
          effective_to: "",
          notes: "",
        }}
      />
    </div>
  );
}
