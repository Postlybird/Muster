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
import { TicketForm } from "../ticket-form";

export const metadata: Metadata = { title: "Edit ticket" };

export default async function EditTicketPage({
  params,
}: PageProps<"/admin/catalogues/tickets/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("credential_types")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!ticket) notFound();
  const archived = !!ticket.archived_at;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/catalogues/tickets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All tickets
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{ticket.name}</h2>
          <CatalogueStatus
            active={ticket.active}
            archivedAt={ticket.archived_at}
          />
        </div>
        <ConfirmAction
          trigger={
            <Button variant="outline" size="sm">
              {archived ? "Restore" : "Archive"}
            </Button>
          }
          title={
            archived ? `Restore ${ticket.name}?` : `Archive ${ticket.name}?`
          }
          description={
            archived
              ? "Workers will be able to add it again."
              : "Workers can't add it any more. Tickets already on file are kept. You can restore it later."
          }
          confirmLabel={archived ? "Restore" : "Archive"}
          variant={archived ? "default" : "destructive"}
          action={setArchived.bind(
            null,
            "credential_types",
            ticket.id,
            !archived,
          )}
        />
      </div>
      <TicketForm
        values={{
          id: ticket.id,
          name: ticket.name,
          description: ticket.description,
          kind: ticket.kind,
          issuer: ticket.issuer,
          state: ticket.state,
          family: ticket.family,
          has_number: ticket.has_number,
          has_expiry: ticket.has_expiry,
          needs_document: ticket.needs_document,
          verification_method: ticket.verification_method,
          active: ticket.active,
        }}
      />
    </div>
  );
}
