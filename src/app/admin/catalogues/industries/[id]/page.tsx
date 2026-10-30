import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/forms/confirm-action";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { setArchived } from "../../actions";
import { CatalogueStatus } from "../../status-badge";
import { IndustryForm } from "../industry-form";

export const metadata: Metadata = { title: "Edit industry" };

export default async function EditIndustryPage({
  params,
}: PageProps<"/admin/catalogues/industries/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data: industry } = await supabase
    .from("industries")
    .select("*, categories(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!industry) notFound();

  const archived = !!industry.archived_at;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/catalogues/industries"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All industries
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{industry.name}</h2>
          <CatalogueStatus
            active={industry.active}
            archivedAt={industry.archived_at}
          />
        </div>
        <ConfirmAction
          trigger={
            <Button variant="outline" size="sm">
              {archived ? "Restore" : "Archive"}
            </Button>
          }
          title={
            archived ? `Restore ${industry.name}?` : `Archive ${industry.name}?`
          }
          description={
            archived
              ? "It will appear in the catalogue and on the website again."
              : "It comes off the website and its work types are listed as other work. You can restore it later."
          }
          confirmLabel={archived ? "Restore" : "Archive"}
          variant={archived ? "default" : "destructive"}
          action={setArchived.bind(null, "industries", industry.id, !archived)}
        />
      </div>
      <p className="text-muted-foreground">
        Work types:{" "}
        {industry.categories.length > 0
          ? industry.categories.map((c) => c.name).join(", ")
          : "none yet. Choose this industry on a work category to add one."}
      </p>
      <IndustryForm
        values={{
          id: industry.id,
          name: industry.name,
          summary: industry.summary,
          description: industry.description,
          icon: industry.icon,
          active: industry.active,
        }}
      />
    </div>
  );
}
