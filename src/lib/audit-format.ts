/**
 * The audit log in plain words (brief §4.9): what kind of record, what was
 * done to it, and what changed.
 */

export const RECORD_LABELS: Readonly<Record<string, string>> = {
  profiles: "Account",
  workers: "Worker details",
  worker_credentials: "Ticket",
  work_rights: "Right to work",
  identity_checks: "ID check",
  worker_categories: "Work types",
  agreement_acceptances: "Agreement accepted",
  applications: "Application",
  assignments: "Booking",
  timesheets: "Timesheet",
  admin_flags: "Queue matter",
  safety_reports: "Safety report",
  ratings: "Rating",
  favourites: "Favourite",
  blocks: "Block",
  businesses: "Business",
  business_users: "Business team",
  sites: "Site",
  jobs: "Job",
  shifts: "Shift",
  invoices: "Invoice",
  pay_runs: "Pay run",
  settings: "Setting",
  notification_templates: "Message wording",
  rate_cards: "Rate card",
  bill_rate_rules: "Bill rule",
  public_holidays: "Public holiday",
  agreements: "Agreement",
  licences: "Licence",
  jurisdictions: "State",
};

const ACTION_LABELS: Readonly<Record<string, string>> = {
  insert: "Added",
  update: "Changed",
  delete: "Removed",
  view_documents: "Viewed documents",
  view_safety_photos: "Viewed safety photos",
};

function sentence(code: string): string {
  const words = code.replaceAll("_", " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function recordLabel(table: string | null): string {
  if (!table) return "—";
  return RECORD_LABELS[table] ?? sentence(table);
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? sentence(action);
}

/** Who did it: a person's name, or our scheduled jobs and server. */
export function actorLabel(name: string | null, role: string | null): string {
  if (name) return name;
  return role === "authenticated" || role === "admin" ? "Someone" : "System";
}

export type FieldChange = { field: string; from: string; to: string };

const BOOKKEEPING = new Set(["created_at", "updated_at"]);

function shown(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function fields(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** The fields a change touched, old and new, leaving out bookkeeping. */
export function changedFields(before: unknown, after: unknown): FieldChange[] {
  const old = fields(before);
  const now = fields(after);
  return [...new Set([...Object.keys(old), ...Object.keys(now)])]
    .filter(
      (key) =>
        !BOOKKEEPING.has(key) &&
        JSON.stringify(old[key]) !== JSON.stringify(now[key]),
    )
    .sort()
    .map((key) => ({
      field: sentence(key),
      from: shown(old[key]),
      to: shown(now[key]),
    }));
}
