import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { loadTickets } from "@/server/tickets";

import { ContinueForm } from "../continue-form";
import { loadStep, StepFrame } from "../step-frame";
import { TicketCard } from "./ticket-card";

export const metadata: Metadata = { title: "Tickets" };

export default async function TicketsPage({
  searchParams,
}: PageProps<"/worker/onboarding/tickets">) {
  const { worker, mode } = await loadStep();
  const { saved } = await searchParams;
  const { rows, policeMaxAgeMonths } = await loadTickets(
    worker.id,
    worker.home_state,
  );

  const police = rows.filter((r) => r.type.kind === "police_check");
  const others = rows.filter((r) => r.type.kind !== "police_check");
  const held = others.filter((r) => r.summary.state !== "missing");
  const addable = others.filter((r) => r.summary.state === "missing");
  const savedRow = rows.find((r) => r.type.code === saved);

  return (
    <StepFrame
      mode={mode}
      step="tickets"
      completed={worker.onboarding_steps}
      title="Tickets"
      description="Add the tickets and licences you have. Each business chooses the tickets its job needs, and we check each one before you can take shifts that need it."
    >
      <div className="max-w-2xl space-y-8">
        {savedRow ? (
          <Alert variant="success">
            <AlertDescription>
              {savedRow.type.name} saved. We&apos;ll check it and let you know.
            </AlertDescription>
          </Alert>
        ) : null}

        <section aria-labelledby="yours" className="space-y-3">
          <h2 id="yours" className="text-lg font-semibold">
            Your tickets
          </h2>
          {held.length > 0 ? (
            <ul className="space-y-3">
              {held.map((row) => (
                <TicketCard key={row.type.id} row={row} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              You haven&apos;t added any tickets yet.
            </p>
          )}
          {addable.length > 0 ? (
            <form
              action="/worker/onboarding/tickets/add"
              method="get"
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-60 flex-1 space-y-2">
                <Label htmlFor="add-ticket">Add a ticket</Label>
                <NativeSelect id="add-ticket" name="code" defaultValue="">
                  <option value="" disabled>
                    Choose a ticket
                  </option>
                  {addable.map((row) => (
                    <option key={row.type.id} value={row.type.code}>
                      {row.type.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <Button type="submit" variant="outline" size="lg">
                Add
              </Button>
            </form>
          ) : null}
        </section>

        {police.length > 0 ? (
          <section aria-labelledby="police" className="space-y-3">
            <h2 id="police" className="text-lg font-semibold">
              Police check
            </h2>
            <p className="text-muted-foreground">
              Some businesses ask for one. If you have a National Police Check
              from the last {policeMaxAgeMonths} months, add it now. Ordering a
              check through us is coming later.
            </p>
            <ul className="space-y-3">
              {police.map((row) => (
                <TicketCard key={row.type.id} row={row} />
              ))}
            </ul>
          </section>
        ) : null}

        {mode === "wizard" ? <ContinueForm step="tickets" /> : null}
      </div>
    </StepFrame>
  );
}
