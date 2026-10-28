import "server-only";

import { addDays } from "@/domain/onboarding";
import { sydneyDateKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type QueueEntry = {
  workerId: string;
  name: string;
  status: "draft" | "pending" | "active" | "suspended" | "offboarded";
  submittedAt: string | null;
  waiting: string[];
};

export type RecheckEntry = {
  workerId: string;
  name: string;
  due: string;
  basis: string;
  subclass: string | null;
};

function displayName(w: {
  preferred_name: string | null;
  legal_first_name: string | null;
  legal_last_name: string | null;
}): string {
  const legal = [w.legal_first_name, w.legal_last_name]
    .filter(Boolean)
    .join(" ");
  return w.preferred_name && w.preferred_name !== w.legal_first_name
    ? `${legal} (${w.preferred_name})`
    : legal || "No name yet";
}

/** Everything waiting for an admin to check (brief §6 verification queue). */
export async function loadVerificationQueue() {
  const supabase = await createClient();
  const soon = addDays(sydneyDateKey(new Date()), 14);

  const [workers, rights, identity, tickets, rechecks] = await Promise.all([
    supabase
      .from("workers")
      .select(
        "id, status, submitted_at, photo_status, payroll_status, preferred_name, legal_first_name, legal_last_name",
      )
      .is("archived_at", null)
      .neq("status", "draft"),
    supabase.from("work_rights").select("worker_id").eq("status", "pending"),
    supabase
      .from("identity_checks")
      .select("worker_id")
      .eq("status", "pending"),
    supabase
      .from("worker_credentials")
      .select("worker_id")
      .eq("status", "pending")
      .is("archived_at", null),
    supabase
      .from("work_rights")
      .select("worker_id, next_check_due, basis, visa_subclass")
      .eq("status", "verified")
      .lte("next_check_due", soon)
      .order("next_check_due"),
  ]);

  const count = (rows: { worker_id: string }[] | null) => {
    const map = new Map<string, number>();
    for (const row of rows ?? [])
      map.set(row.worker_id, (map.get(row.worker_id) ?? 0) + 1);
    return map;
  };
  const rightsWaiting = count(rights.data);
  const identityWaiting = count(identity.data);
  const ticketsWaiting = count(tickets.data);
  const byId = new Map((workers.data ?? []).map((w) => [w.id, w]));

  const entries: QueueEntry[] = [];
  for (const w of workers.data ?? []) {
    const waiting: string[] = [];
    if (w.photo_status === "pending") waiting.push("Photo");
    if (rightsWaiting.has(w.id)) waiting.push("Right to work");
    if (identityWaiting.has(w.id)) waiting.push("Photo ID");
    const t = ticketsWaiting.get(w.id) ?? 0;
    if (t > 0) waiting.push(t === 1 ? "1 ticket" : `${t} tickets`);
    if (w.status === "pending" && w.payroll_status !== "complete") {
      waiting.push("Payroll setup");
    }
    if (waiting.length === 0 && w.status !== "pending") continue;
    if (waiting.length === 0) waiting.push("Ready to activate");
    entries.push({
      workerId: w.id,
      name: displayName(w),
      status: w.status,
      submittedAt: w.submitted_at,
      waiting,
    });
  }
  const bySubmitted = (a: QueueEntry, b: QueueEntry) =>
    (a.submittedAt ?? "").localeCompare(b.submittedAt ?? "");

  return {
    newWorkers: entries.filter((e) => e.status === "pending").sort(bySubmitted),
    updates: entries.filter((e) => e.status !== "pending").sort(bySubmitted),
    rechecks: (rechecks.data ?? []).flatMap((r): RecheckEntry[] => {
      const w = byId.get(r.worker_id);
      return w && r.next_check_due
        ? [
            {
              workerId: r.worker_id,
              name: displayName(w),
              due: r.next_check_due,
              basis: r.basis,
              subclass: r.visa_subclass,
            },
          ]
        : [];
    }),
  };
}
