import { CalendarCheck } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { WhatsNext } from "@/components/status/whats-next";
import { requireRole } from "@/lib/auth";
import { workerStatuses } from "@/lib/statuses";

export const metadata: Metadata = { title: "Home" };

export default async function WorkerHomePage() {
  const user = await requireRole("worker");
  const firstName = user.fullName?.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {firstName ? `Hi ${firstName}` : "Welcome"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s where you&apos;re up to.
        </p>
      </div>

      {/* Phase 1 (step 1.2) replaces this with the real onboarding status. */}
      <WhatsNext title="Your account" status={workerStatuses.draft} />

      <section aria-labelledby="next-shift" className="space-y-3">
        <h2 id="next-shift" className="text-lg font-semibold">
          Next shift
        </h2>
        <EmptyState
          icon={CalendarCheck}
          title="No shifts yet"
          description="Once your details are verified, shifts that match your tickets will appear under Find shifts."
        />
      </section>
    </div>
  );
}
