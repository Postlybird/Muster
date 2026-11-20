import Link from "next/link";

import { ConfirmAction } from "@/components/forms/confirm-action";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { createClient } from "@/lib/supabase/server";
import { LAUNCH_BATCH } from "@/server/launch";

import { emailEveryoneWereOpen } from "./actions";

/**
 * "Tell everyone we're open" (owner, 20/11/2026), under the launch notice:
 * ready once the notice is off and a state is open for work.
 */
export async function LaunchEmail({ noticeOn }: { noticeOn: boolean }) {
  const supabase = await createClient();
  const { count: openStates } = await supabase
    .from("jurisdictions")
    .select("code", { count: "exact", head: true })
    .eq("open_for_work", true);
  const waitingFor = noticeOn
    ? "Switch off the launch notice above first."
    : !openStates
      ? "Open a state for work in Licences first."
      : null;

  return (
    <section
      aria-labelledby="launch-email"
      className="space-y-3 rounded-lg border bg-card p-4"
    >
      <h2 id="launch-email" className="text-lg font-semibold">
        Tell everyone we&apos;re open
      </h2>
      <p className="text-sm">
        When you open for shifts, switch off the launch notice, open a state in{" "}
        <Link href="/admin/licences" className="underline">
          Licences
        </Link>
        , then email everyone who has signed up. Each person is told once, by
        app notification or email, up to {LAUNCH_BATCH} at a time.
      </p>
      {waitingFor ? (
        <p className="text-sm text-muted-foreground">{waitingFor}</p>
      ) : (
        <ConfirmAction
          trigger={<Button>Email everyone that we&apos;re open</Button>}
          title="Email everyone that we're open?"
          description={`Everyone who has signed up, workers and businesses, hears that ${brand.name} is open for shifts. Each person is told once.`}
          confirmLabel="Email them"
          action={emailEveryoneWereOpen}
          variant="default"
        />
      )}
    </section>
  );
}
