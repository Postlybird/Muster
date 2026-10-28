import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { businessOptions } from "@/server/businesses";

import { RateCardForm } from "../rate-card-form";

export const metadata: Metadata = { title: "Add a rate card" };

export default async function NewRateCardPage({
  searchParams,
}: PageProps<"/admin/rates/rate-cards/new">) {
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
          ? `Add a rate card for ${forBusiness.name}`
          : "Add a rate card"}
      </h2>
      <RateCardForm
        categories={categories ?? []}
        businesses={businesses}
        values={{
          id: null,
          business_id: forBusiness?.id ?? "",
          category_id: "",
          level: 1,
          base_rate: "",
          multipliers: {
            ordinary: 1.25,
            saturday: 1.75,
            sunday: 2.25,
            public_holiday: 2.75,
            overtime: 1.875,
            night: 1.4,
          },
          effective_from: "",
          effective_to: "",
          checked_by: "",
          checked_on: "",
          notes: "",
        }}
      />
    </div>
  );
}
