import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { OfferCard } from "@/components/shifts/offer-card";
import { PreviewList } from "@/components/shifts/preview-list";
import { Button } from "@/components/ui/button";
import { quickStartDone } from "@/domain/onboarding";
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
    const signedUp = quickStartDone(worker.onboarding_steps);
    return (
      <div className="space-y-6">
        <PageHeader title="Find shifts" />
        {waiting && signedUp ? (
          // Not checked yet: what's near them, but they can't apply.
          <>
            {worker.status === "draft" ? (
              <Button asChild variant="outline">
                <Link href="/worker">Get ready to work</Link>
              </Button>
            ) : null}
            <PreviewList headingLevel="h2" />
          </>
        ) : (
          <EmptyState
            icon={Search}
            title={
              waiting
                ? "Finish signing up to see shifts near you"
                : "You can't take new shifts right now"
            }
            description={
              waiting
                ? "Two quick things: your mobile, and your suburb and the work you want."
                : workerStatuses[worker.status].next
            }
            action={
              waiting ? (
                <Button asChild variant="outline">
                  <Link href="/worker/onboarding/start">Finish signing up</Link>
                </Button>
              ) : undefined
            }
          />
        )}
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
