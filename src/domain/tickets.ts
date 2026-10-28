/**
 * Where a worker stands with one kind of ticket, from all their copies of it
 * (a verified one, a renewal waiting to be checked, old expired ones).
 */

export type TicketRecord = {
  id: string;
  status: "pending" | "verified" | "rejected" | "expired";
  expiresOn: string | null;
  /** Police checks: issue date plus the maximum age setting. */
  validUntil?: string | null;
  rejectionReason: string | null;
  archived: boolean;
};

export type TicketSummary =
  | { state: "missing" }
  | { state: "pending"; openId: string; verifiedUntil: string | null }
  | {
      state: "rejected";
      openId: string;
      reason: string | null;
      verifiedUntil: string | null;
    }
  | { state: "verified"; validUntil: string | null; expiringSoon: boolean }
  | { state: "expired"; expiredOn: string | null };

/** The last day a verified copy counts, if it ends at all. */
function lastValidDay(record: TicketRecord): string | null {
  const dates = [record.expiresOn, record.validUntil].filter(
    (d): d is string => !!d,
  );
  return dates.length > 0 ? dates.sort()[0]! : null;
}

export function summariseTicket(
  records: readonly TicketRecord[],
  today: string,
  soonDays = 30,
): TicketSummary {
  const live = records.filter((r) => !r.archived);
  const verified = live
    .filter((r) => r.status === "verified")
    .map((r) => ({ record: r, until: lastValidDay(r) }))
    .filter(({ until }) => until === null || until >= today)
    .sort((a, b) => (b.until ?? "9999").localeCompare(a.until ?? "9999"))[0];
  const verifiedUntil = verified ? verified.until : null;
  const open = live.find(
    (r) => r.status === "pending" || r.status === "rejected",
  );

  if (open?.status === "rejected") {
    return {
      state: "rejected",
      openId: open.id,
      reason: open.rejectionReason,
      verifiedUntil,
    };
  }
  if (open) return { state: "pending", openId: open.id, verifiedUntil };

  if (verified) {
    const soon = new Date(`${today}T00:00:00Z`);
    soon.setUTCDate(soon.getUTCDate() + soonDays);
    const soonKey = soon.toISOString().slice(0, 10);
    return {
      state: "verified",
      validUntil: verified.until,
      expiringSoon: verified.until !== null && verified.until <= soonKey,
    };
  }

  const lapsed = live
    .filter((r) => r.status === "expired" || r.status === "verified")
    .map(lastValidDay)
    .sort()
    .reverse();
  if (lapsed.length > 0)
    return { state: "expired", expiredOn: lapsed[0] ?? null };
  return { state: "missing" };
}
