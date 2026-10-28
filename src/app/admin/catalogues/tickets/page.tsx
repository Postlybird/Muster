import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { CatalogueStatus } from "../status-badge";
import { kindLabels } from "./labels";

export const metadata: Metadata = { title: "Tickets" };

export default async function TicketsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("credential_types")
    .select(
      "id, name, kind, issuer, has_number, has_expiry, active, archived_at",
    )
    .order("archived_at", { nullsFirst: true })
    .order("sort_order");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/admin/catalogues/tickets/new">
            <Plus aria-hidden />
            Add ticket
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Issuer</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(tickets ?? []).map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>
                <Link
                  href={`/admin/catalogues/tickets/${ticket.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {ticket.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {kindLabels[ticket.kind]}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {ticket.issuer ?? "—"}
              </TableCell>
              <TableCell>{ticket.has_expiry ? "Yes" : "No"}</TableCell>
              <TableCell>
                <CatalogueStatus
                  active={ticket.active}
                  archivedAt={ticket.archived_at}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
