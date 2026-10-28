import { Users } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { ActionButton } from "@/components/forms/action-button";
import { WorkerCard } from "@/components/jobs/worker-card";
import { PageHeader } from "@/components/page-header";
import { NoteForm } from "@/components/timesheets/note-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDayShort } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { canManage, getMyBusiness } from "@/server/businesses";
import { workerPhotoLinks } from "@/server/worker-photos";

import { addFavourite, block, removeFavourite, unblock } from "./actions";

export const metadata: Metadata = { title: "Workers" };

type Row =
  Database["public"]["Functions"]["business_workers"]["Returns"][number];

/** Some columns are empty, whatever the generated types say. */
type BusinessWorker = Omit<
  Row,
  | "photo_path"
  | "rating"
  | "reliability"
  | "last_worked_at"
  | "block_id"
  | "block_reason"
> & {
  photo_path: string | null;
  rating: number | null;
  reliability: number | null;
  last_worked_at: string | null;
  block_id: string | null;
  block_reason: string | null;
};

function history(worker: BusinessWorker): string {
  if (worker.shifts_here === 0 || !worker.last_worked_at) {
    return "No shifts with you yet.";
  }
  const shifts =
    worker.shifts_here === 1 ? "1 shift" : `${worker.shifts_here} shifts`;
  return `${shifts} with you, the last on ${formatDayShort(worker.last_worked_at)}.`;
}

function Section({
  id,
  title,
  description,
  workers,
  photos,
}: {
  id: string;
  title: string;
  description: string;
  workers: BusinessWorker[];
  photos: Map<string, string>;
}) {
  if (workers.length === 0) return null;
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="space-y-1">
        <h2 id={id} className="text-lg font-semibold">
          {title} ({workers.length})
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="divide-y rounded-lg border">
        {workers.map((worker) => (
          <li key={worker.worker_id} className="p-4">
            <WorkerCard
              name={worker.display_name}
              photoUrl={
                worker.photo_path
                  ? (photos.get(worker.photo_path) ?? null)
                  : null
              }
              rating={worker.rating === null ? null : Number(worker.rating)}
              reliability={
                worker.reliability === null ? null : Number(worker.reliability)
              }
              shiftsCompleted={worker.shifts_completed}
            >
              <p className="text-sm">{history(worker)}</p>
              {worker.block_id ? (
                <>
                  {worker.block_reason ? (
                    <p className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
                      Why: {worker.block_reason}
                    </p>
                  ) : null}
                  <ActionButton
                    variant="outline"
                    size="sm"
                    action={unblock.bind(null, worker.worker_id)}
                    pendingText="Unblocking…"
                    aria-label={`Offer them work again: ${worker.display_name}`}
                  >
                    Offer them work again
                  </ActionButton>
                </>
              ) : (
                <div className="space-y-2">
                  <ActionButton
                    variant="outline"
                    size="sm"
                    action={(worker.favourite
                      ? removeFavourite
                      : addFavourite
                    ).bind(null, worker.worker_id)}
                    pendingText="Saving…"
                    aria-label={`${worker.favourite ? "Remove from favourites" : "Add to favourites"}: ${worker.display_name}`}
                  >
                    {worker.favourite
                      ? "Remove from favourites"
                      : "Add to favourites"}
                  </ActionButton>
                  <details>
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary underline-offset-4 hover:underline">
                      Don&apos;t offer {worker.display_name} our work
                    </summary>
                    <div className="pt-2">
                      <NoteForm
                        action={block.bind(null, worker.worker_id)}
                        id={`block-${worker.worker_id}`}
                        label="Why?"
                        hint="They aren't told. Only our team sees this."
                        submitLabel="Block"
                        pendingText="Blocking…"
                        variant="outline"
                      />
                    </div>
                  </details>
                </div>
              )}
            </WorkerCard>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The business's workers (brief §7): favourites, everyone who has worked
 * for them, and anyone they've blocked. Owners and managers look after
 * favourites and blocks.
 */
export default async function BusinessWorkersPage() {
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) {
    return (
      <div className="max-w-3xl space-y-6">
        <PageHeader title="Workers" />
        <Alert variant="info">
          <AlertDescription>
            Your owner or managers look after your favourite and blocked
            workers.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("business_workers");
  const workers = (data ?? []) as BusinessWorker[];
  const photos = await workerPhotoLinks(workers.map((w) => w.photo_path));
  const blocked = workers.filter((w) => w.block_id);
  const favourites = workers.filter((w) => w.favourite && !w.block_id);
  const others = workers.filter((w) => !w.favourite && !w.block_id);

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Workers"
        description="Your favourites, everyone who's worked for you, and anyone you'd rather not have back."
      />
      {workers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No workers yet"
          description="Once workers have done shifts for you, they show here, ready to make favourites."
        />
      ) : null}
      <Section
        id="favourites"
        title="Favourites"
        description="They see your work first, and come first among applicants."
        workers={favourites}
        photos={photos}
      />
      <Section
        id="worked"
        title="Worked with you"
        description="Most recent first."
        workers={others}
        photos={photos}
      />
      <Section
        id="blocked"
        title="Blocked"
        description="They aren't offered your work, and they aren't told."
        workers={blocked}
        photos={photos}
      />
    </div>
  );
}
