import { must, type SeedClient } from "../client";
import { DEMO_BOOKINGS } from "../data/bookings";

/**
 * Applies and books demo workers on the demo jobs' shifts still to come,
 * through the same database function the app books with. Safe to repeat:
 * applying twice changes nothing, and booking twice is refused.
 */
export async function seedBookings(client: SeedClient) {
  const [workers, jobs] = await Promise.all([
    client.from("workers").select("id, legal_first_name, legal_last_name"),
    client
      .from("jobs")
      .select(
        "id, businesses!inner(trading_name), sites!inner(name), shifts!inner(id, starts_at, status, shift_matches(worker_id, eligible))",
      )
      .eq("status", "posted")
      .gt("shifts.starts_at", new Date().toISOString()),
  ]);
  const workerId = new Map(
    must(workers, "workers").map((w) => [
      `${w.legal_first_name} ${w.legal_last_name}`,
      w.id,
    ]),
  );
  let applied = 0;
  let booked = 0;
  for (const plan of DEMO_BOOKINGS) {
    const matching = must(jobs, "jobs").filter(
      (job) =>
        job.businesses.trading_name === plan.business &&
        job.sites.name === plan.site,
    );
    for (const job of matching) {
      // Only the days each worker can actually do.
      const canDo = (id: string) =>
        job.shifts.filter((shift) =>
          shift.shift_matches.some((m) => m.worker_id === id && m.eligible),
        );
      for (const name of plan.applied ?? []) {
        const id = workerId.get(name);
        if (!id) continue;
        const rows = canDo(id).map((shift) => ({
          shift_id: shift.id,
          worker_id: id,
        }));
        if (rows.length === 0) continue;
        const inserted = must(
          await client
            .from("applications")
            .upsert(rows, {
              onConflict: "shift_id,worker_id",
              ignoreDuplicates: true,
            })
            .select("id"),
          "applications",
        );
        applied += inserted.length;
      }
      for (const name of plan.booked ?? []) {
        const id = workerId.get(name);
        if (!id) continue;
        for (const shift of canDo(id)) {
          const { data } = await client.rpc("book_worker", {
            p_shift_id: shift.id,
            p_worker_id: id,
            p_check_visible: false,
          });
          if (data === "booked") booked += 1;
        }
      }
    }
  }
  return { applied, booked };
}
