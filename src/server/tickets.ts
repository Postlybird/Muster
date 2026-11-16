import "server-only";

import { addDays, addMonths } from "@/domain/onboarding";
import {
  summariseTicket,
  type TicketRecord,
  type TicketSummary,
} from "@/domain/tickets";
import { sydneyDateKey } from "@/lib/format";
import { heldInState } from "@/lib/state-tickets";
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
  | "state"
  | "family"
>;

export type TicketRow = {
  type: TicketType;
  summary: TicketSummary;
};

/**
 * Every ticket type with where this worker stands, for the tickets step.
 * Tickets issued state by state are their home state's version, plus any
 * other state's they've added. Businesses choose the tickets each job needs
 * (owner, 16/11/2026), so none is shown as needed for a work type.
 */
export async function loadTickets(workerId: string, homeState: string) {
  const supabase = await createClient();
  const today = sydneyDateKey(new Date());
  const settings = await getAllSettings();

  const [{ data: types }, { data: records }] = await Promise.all([
    supabase
      .from("credential_types")
      .select(
        "id, code, name, description, kind, has_number, has_expiry, needs_document, state, family",
      )
      .eq("active", true)
      .is("archived_at", null)
      .order("sort_order")
      .order("name"),
    supabase
      .from("worker_credentials")
      .select(
        "id, credential_type_id, status, issued_on, expires_on, rejection_reason, archived_at",
      )
      .eq("worker_id", workerId)
      .is("archived_at", null),
  ]);

  const held = new Set((records ?? []).map((r) => r.credential_type_id));
  const shown = (types ?? []).filter(
    (type) => heldInState(type, homeState) || held.has(type.id),
  );
  const rows: TicketRow[] = shown.map((type) => {
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
    return { type, summary: summariseTicket(mine, today) };
  });

  return {
    rows,
    today,
    policeMaxAgeMonths: settings.police_check_max_age_months,
  };
}
