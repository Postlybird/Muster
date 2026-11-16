import type { Metadata } from "next";

import { groupByIndustry } from "@/lib/industries";
import { createClient } from "@/lib/supabase/server";

import { loadStep, StepFrame } from "../step-frame";
import { WorkTypesForm } from "./work-types-form";

export const metadata: Metadata = { title: "Work types" };

export default async function WorkTypesPage() {
  const { worker, mode } = await loadStep();
  const supabase = await createClient();
  const [{ data: categories }, { data: mine }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, description, sort_order, industries(name, sort_order)")
      .eq("active", true)
      .is("archived_at", null)
      .order("sort_order")
      .order("name"),
    supabase
      .from("worker_categories")
      .select("category_id, years_experience")
      .eq("worker_id", worker.id),
  ]);

  const groups = groupByIndustry(categories ?? []).map((group) => ({
    name: group.name,
    categories: group.items.map(({ id, name, description }) => ({
      id,
      name,
      description,
    })),
  }));

  return (
    <StepFrame
      mode={mode}
      step="work-types"
      completed={worker.onboarding_steps}
      title="Work types"
      description="The kinds of work you'd like, and your experience."
    >
      <WorkTypesForm
        mode={mode}
        groups={groups}
        chosen={Object.fromEntries(
          (mine ?? []).map((row) => [row.category_id, row.years_experience]),
        )}
        bio={worker.bio ?? ""}
      />
    </StepFrame>
  );
}
