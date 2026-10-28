import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";

import { TicketForm } from "../ticket-form";

export const metadata: Metadata = { title: "Add a ticket" };

export default async function NewTicketPage() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Add a ticket</h2>
      <TicketForm
        values={{
          id: null,
          name: "",
          description: "",
          kind: "ticket",
          issuer: null,
          has_number: true,
          has_expiry: true,
          needs_document: true,
          verification_method: "manual",
          active: true,
        }}
      />
    </div>
  );
}
