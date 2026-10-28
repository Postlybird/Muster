import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

export default async function NewBillRulePage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .is("archived_at", null)
    .order("sort_order");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Add a bill rule</h2>
      <BillRuleForm
        categories={categories ?? []}
        values={{
          id: null,
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
