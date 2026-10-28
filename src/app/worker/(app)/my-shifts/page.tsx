import { CalendarCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { MyShiftCard } from "@/components/shifts/my-shift-card";
import { Button } from "@/components/ui/button";
import { groupMyShifts, type MyJob } from "@/lib/my-shifts";
import { createClient } from "@/lib/supabase/server";
import { getMyWorker } from "@/server/workers";

export const metadata: Metadata = { title: "My shifts" };

function Group({
  id,
  title,
  jobs,
  status,
}: {
  id: string;
  title: string;
  jobs: MyJob[];
  status: "booked" | "applied" | "filled" | "cancelled";
}) {
  if (jobs.length === 0) return null;
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <ul className="space-y-3">
        {jobs.map((job) => (
          <li key={job.jobId}>
            <MyShiftCard job={job} status={status} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The worker's booked shifts and applications (brief §4.4). */
export default async function MyShiftsPage() {
  await getMyWorker();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_shifts");
  if (error) throw new Error(`Loading your shifts: ${error.message}`);
  const groups = groupMyShifts(data ?? []);
  const nothing =
    groups.booked.length +
      groups.applied.length +
      groups.filled.length +
      groups.cancelled.length ===
    0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My shifts"
        description="Shifts you're booked on and the ones you've applied for."
      />
      {nothing ? (
        <EmptyState
          icon={CalendarCheck}
          title="No shifts yet"
          description="Shifts you take or apply for show here, with the address once you're booked."
          action={
            <Button asChild variant="outline">
              <Link href="/worker/shifts">Find shifts</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Group
            id="booked"
            title="Booked"
            jobs={groups.booked}
            status="booked"
          />
          <Group
            id="applied"
            title="Waiting to hear"
            jobs={groups.applied}
            status="applied"
          />
          <Group
            id="cancelled"
            title="Cancelled by the business"
            jobs={groups.cancelled}
            status="cancelled"
          />
          <Group
            id="filled"
            title="Filled by others"
            jobs={groups.filled}
            status="filled"
          />
        </>
      )}
    </div>
  );
}
