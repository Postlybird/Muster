import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { SimpleList } from "../simple-list";

export const metadata: Metadata = { title: "Hazards" };

export default async function HazardsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("hazards")
    .select("id, name, active, archived_at")
    .order("archived_at", { nullsFirst: true })
    .order("sort_order");
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        The site hazards businesses tick when they post work. Workers see them
        before accepting.
      </p>
      <SimpleList items={data ?? []} table="hazards" noun="hazard" />
    </div>
  );
}
