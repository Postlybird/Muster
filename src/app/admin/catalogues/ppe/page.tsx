import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { SimpleList } from "../simple-list";

export const metadata: Metadata = { title: "PPE" };

export default async function PpePage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("ppe_items")
    .select("id, name, active, archived_at")
    .order("archived_at", { nullsFirst: true })
    .order("sort_order");
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Protective equipment businesses can require. Categories pre-tick their
        defaults.
      </p>
      <SimpleList items={data ?? []} table="ppe_items" noun="PPE item" />
    </div>
  );
}
