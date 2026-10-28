import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/forms/confirm-action";
import { Button } from "@/components/ui/button";
import { rateCardFromRow } from "@/domain/rates";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { setRateArchived } from "../../actions";
import { RateCardForm } from "../rate-card-form";

export const metadata: Metadata = { title: "Edit rate card" };

export default async function EditRateCardPage({
  params,
}: PageProps<"/admin/rates/rate-cards/[id]">) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: card }, { data: categories }] = await Promise.all([
    supabase
      .from("rate_cards")
      .select("*, categories(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name")
      .is("archived_at", null)
      .order("sort_order"),
  ]);
  if (!card) notFound();
  const archived = !!card.archived_at;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/rates/rate-cards"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All rate cards
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {card.categories?.name}, level {card.level}
          {archived ? " (archived)" : ""}
        </h2>
        <ConfirmAction
          trigger={
            <Button variant="outline" size="sm">
              {archived ? "Restore" : "Archive"}
            </Button>
          }
          title={
            archived ? "Restore this rate card?" : "Archive this rate card?"
          }
          description={
            archived
              ? "It will apply to new shifts again."
              : "It stops applying to new shifts. Shifts already booked keep the rates they were booked at."
          }
          confirmLabel={archived ? "Restore" : "Archive"}
          variant={archived ? "default" : "destructive"}
          action={setRateArchived.bind(null, "rate_cards", card.id, !archived)}
        />
      </div>
      <RateCardForm
        categories={categories ?? []}
        values={{
          id: card.id,
          category_id: card.category_id,
          level: card.level,
          base_rate: (card.base_rate_cents / 100).toFixed(2),
          multipliers: rateCardFromRow(card).multipliers,
          effective_from: card.effective_from,
          effective_to: card.effective_to ?? "",
          checked_by: card.checked_by ?? "",
          checked_on: card.checked_on ?? "",
          notes: card.notes,
        }}
      />
    </div>
  );
}
