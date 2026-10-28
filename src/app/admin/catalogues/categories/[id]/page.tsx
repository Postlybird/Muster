import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/forms/confirm-action";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { setArchived } from "../../actions";
import { CatalogueStatus } from "../../status-badge";
import { CategoryForm } from "../category-form";

export const metadata: Metadata = { title: "Edit category" };

export default async function EditCategoryPage({
  params,
}: PageProps<"/admin/catalogues/categories/[id]">) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: category }, { data: tickets }, { data: ppe }] =
    await Promise.all([
      supabase
        .from("categories")
        .select(
          "*, category_credentials(credential_type_id), category_ppe(ppe_item_id)",
        )
        .eq("id", id)
        .maybeSingle(),
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
  if (!category) notFound();

  const archived = !!category.archived_at;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/catalogues/categories"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All categories
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{category.name}</h2>
          <CatalogueStatus
            active={category.active}
            archivedAt={category.archived_at}
          />
        </div>
        <ConfirmAction
          trigger={
            <Button variant="outline" size="sm">
              {archived ? "Restore" : "Archive"}
            </Button>
          }
          title={
            archived ? `Restore ${category.name}?` : `Archive ${category.name}?`
          }
          description={
            archived
              ? "It will appear in the catalogue again."
              : "It disappears from the catalogue but stays on past jobs and records. You can restore it later."
          }
          confirmLabel={archived ? "Restore" : "Archive"}
          variant={archived ? "default" : "destructive"}
          action={setArchived.bind(null, "categories", category.id, !archived)}
        />
      </div>
      <CategoryForm
        values={{
          id: category.id,
          name: category.name,
          description: category.description,
          police_check_required: category.police_check_required,
          min_engagement_hours: Number(category.min_engagement_hours),
          default_level: category.default_level,
          workers_comp_pct:
            category.workers_comp_pct === null
              ? null
              : Number(category.workers_comp_pct),
          active: category.active,
          credential_type_ids: category.category_credentials.map(
            (c) => c.credential_type_id,
          ),
          ppe_item_ids: category.category_ppe.map((p) => p.ppe_item_id),
        }}
        tickets={tickets ?? []}
        ppe={ppe ?? []}
      />
    </div>
  );
}
