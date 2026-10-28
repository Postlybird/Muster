import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { OfferCard } from "@/components/shifts/offer-card";
import { Button } from "@/components/ui/button";
import { groupOffers } from "@/lib/offers";
import { workerStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { refreshWorkerMatches } from "@/server/matching";
import { getMyWorker } from "@/server/workers";

export const metadata: Metadata = { title: "Find shifts" };

/** The shifts a worker can take (brief §4.4), one card per job. */
export default async function FindShiftsPage() {
  const { worker } = await getMyWorker();
  if (worker.status !== "active") {
    const waiting = worker.status === "draft" || worker.status === "pending";
    return (
      <div className="space-y-6">
        <PageHeader title="Find shifts" />
        <EmptyState
          icon={Search}
          title={
            waiting
              ? "Shifts show here once you're verified"
              : "You can't take new shifts right now"
          }
          description={
            waiting
              ? "Finish your checklist on the home screen and we'll check your details."
              : workerStatuses[worker.status].next
          }
          action={
            waiting ? (
              <Button asChild variant="outline">
                <Link href="/worker">Go to your checklist</Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  // Up to date with any change to their work types, travel or dates.
  await refreshWorkerMatches(worker.id, { notify: false });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_shift_offers");
  if (error) throw new Error(`Loading your shifts: ${error.message}`);
  const offers = groupOffers(data ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find shifts"
        description="Work you can take, soonest first."
      />
      {offers.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No shifts for you right now"
          description={
            worker.urgent_opt_in
              ? "New work shows here as soon as it's posted, and we'll text you about urgent call-outs."
              : "New work shows here as soon as it's posted. Turn on urgent call-outs in Availability to hear about last-minute work by text."
          }
        />
      ) : (
        <ul className="space-y-3" aria-label="Shifts you can take">
          {offers.map((offer) => (
            <li key={offer.jobId}>
              <OfferCard offer={offer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
