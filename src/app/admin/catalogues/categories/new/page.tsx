import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { CategoryForm } from "../category-form";

export const metadata: Metadata = { title: "Add a category" };

export default async function NewCategoryPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: tickets }, { data: ppe }] = await Promise.all([
    supabase
      .from("credential_types")
      .select("id, name")
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("ppe_items")
      .select("id, name")
      .is("archived_at", null)
      .order("sort_order"),
  ]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Add a category</h2>
      <CategoryForm
        values={{
          id: null,
          name: "",
          description: "",
          police_check_required: false,
          min_engagement_hours: 3,
          default_level: 1,
          workers_comp_pct: null,
          active: true,
          credential_type_ids: [],
          ppe_item_ids: [],
        }}
        tickets={tickets ?? []}
        ppe={ppe ?? []}
      />
    </div>
  );
}
