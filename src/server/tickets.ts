import "server-only";

import { addDays, addMonths } from "@/domain/onboarding";
import {
  summariseTicket,
  type TicketRecord,
  type TicketSummary,
} from "@/domain/tickets";
import { sydneyDateKey } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getAllSettings } from "@/server/settings";

export type TicketType = Pick<
  Tables<"credential_types">,
  | "id"
  | "code"
  | "name"
  | "description"
  | "kind"
  | "has_number"
  | "has_expiry"
  | "needs_document"
>;

export type TicketRow = {
  type: TicketType;
  /** Work types the worker chose that need this ticket. */
  neededFor: string[];
  summary: TicketSummary;
};

/** Every ticket type with where this worker stands, for the tickets step. */
export async function loadTickets(workerId: string) {
  const supabase = await createClient();
  const today = sydneyDateKey(new Date());
  const settings = await getAllSettings();

  const [{ data: types }, { data: categories }, { data: records }] =
    await Promise.all([
      supabase
        .from("credential_types")
        .select(
          "id, code, name, description, kind, has_number, has_expiry, needs_document",
        )
        .eq("active", true)
        .is("archived_at", null)
        .order("sort_order")
        .order("name"),
      supabase
        .from("worker_categories")
        .select(
          "categories(name, police_check_required, category_credentials(credential_type_id))",
        )
        .eq("worker_id", workerId),
      supabase
        .from("worker_credentials")
        .select(
          "id, credential_type_id, status, issued_on, expires_on, rejection_reason, archived_at",
        )
        .eq("worker_id", workerId)
        .is("archived_at", null),
    ]);

  const neededFor = new Map<string, string[]>();
  const policeNeededFor: string[] = [];
  for (const row of categories ?? []) {
    const category = row.categories;
    if (!category) continue;
    if (category.police_check_required) policeNeededFor.push(category.name);
    for (const link of category.category_credentials) {
      neededFor.set(link.credential_type_id, [
        ...(neededFor.get(link.credential_type_id) ?? []),
        category.name,
      ]);
    }
  }

  const rows: TicketRow[] = (types ?? []).map((type) => {
    const isPolice = type.kind === "police_check";
    const mine: TicketRecord[] = (records ?? [])
      .filter((r) => r.credential_type_id === type.id)
      .map((r) => ({
        id: r.id,
        status: r.status,
        expiresOn: r.expires_on,
        validUntil:
          isPolice && r.issued_on
            ? addDays(
                addMonths(r.issued_on, settings.police_check_max_age_months),
                -1,
              )
            : null,
        rejectionReason: r.rejection_reason,
        archived: !!r.archived_at,
      }));
    const needs = [
      ...(neededFor.get(type.id) ?? []),
      ...(isPolice ? policeNeededFor : []),
    ];
    return {
      type,
      neededFor: [...new Set(needs)],
      summary: summariseTicket(mine, today),
    };
  });

  return {
    rows,
    today,
    policeMaxAgeMonths: settings.police_check_max_age_months,
  };
}
