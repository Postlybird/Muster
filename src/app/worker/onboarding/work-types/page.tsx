import type { Metadata } from "next";

import { groupByIndustry } from "@/lib/industries";
import { createClient } from "@/lib/supabase/server";

import { loadStep, StepFrame } from "../step-frame";
import { WorkTypesForm, type CategoryOption } from "./work-types-form";

export const metadata: Metadata = { title: "Work types" };

export default async function WorkTypesPage() {
  const { worker, mode } = await loadStep();
  const supabase = await createClient();
  const [{ data: categories }, { data: mine }] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id, name, description, police_check_required, sort_order, industries(name, sort_order), category_credentials(credential_types(name, sort_order, active))",
      )
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
    categories: group.items.map(toOption),
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

type CategoryRow = {
  id: string;
  name: string;
  description: string;
  police_check_required: boolean;
  category_credentials: {
    credential_types: {
      name: string;
      sort_order: number;
      active: boolean;
    } | null;
  }[];
};

function toOption(category: CategoryRow): CategoryOption {
  const tickets = category.category_credentials
    .map((link) => link.credential_types)
    .filter((type): type is NonNullable<typeof type> => !!type?.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((type) => type.name);
  if (
    category.police_check_required &&
    !tickets.some((name) => /police/i.test(name))
  ) {
    tickets.push("National Police Check");
  }
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    needs: tickets,
  };
}
