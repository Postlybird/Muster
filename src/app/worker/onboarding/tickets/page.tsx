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
  const { rows, policeMaxAgeMonths } = await loadTickets(worker.id);

  const police = rows.filter((r) => r.type.kind === "police_check");
  const others = rows.filter((r) => r.type.kind !== "police_check");
  const needed = others.filter((r) => r.neededFor.length > 0);
  const extra = others.filter(
    (r) => r.neededFor.length === 0 && r.summary.state !== "missing",
  );
  const addable = others.filter(
    (r) => r.neededFor.length === 0 && r.summary.state === "missing",
  );
  const missingNeeded = [...needed, ...police.filter((r) => r.neededFor.length)]
    .filter(
      (r) => r.summary.state === "missing" || r.summary.state === "expired",
    )
    .map((r) => r.type.name);
  const savedRow = rows.find((r) => r.type.code === saved);

  return (
    <StepFrame
      mode={mode}
      step="tickets"
      completed={worker.onboarding_steps}
      title="Tickets"
      description="Add the tickets and licences you have. We check each one before you can take shifts that need it."
    >
      <div className="max-w-2xl space-y-8">
        {savedRow ? (
          <Alert variant="success">
            <AlertDescription>
              {savedRow.type.name} saved. We&apos;ll check it and let you know.
            </AlertDescription>
          </Alert>
        ) : null}

        <section aria-labelledby="needed" className="space-y-3">
          <h2 id="needed" className="text-lg font-semibold">
            Needed for your work types
          </h2>
          {needed.length > 0 ? (
            <ul className="space-y-3">
              {needed.map((row) => (
                <TicketCard key={row.type.id} row={row} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              {police.some((r) => r.neededFor.length > 0)
                ? "Apart from a police check (below), the work types you chose don't need any tickets."
                : "The work types you chose don't need any tickets."}
            </p>
          )}
        </section>

        {police.length > 0 ? (
          <section aria-labelledby="police" className="space-y-3">
            <h2 id="police" className="text-lg font-semibold">
              Police check
            </h2>
            <p className="text-muted-foreground">
              {police.some((r) => r.neededFor.length > 0)
                ? `Some of your work types need a National Police Check issued in the last ${policeMaxAgeMonths} months.`
                : `Some businesses ask for one. If you have a National Police Check from the last ${policeMaxAgeMonths} months, add it now.`}{" "}
              Ordering a check through us is coming later.
            </p>
            <ul className="space-y-3">
              {police.map((row) => (
                <TicketCard key={row.type.id} row={row} />
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="other" className="space-y-3">
          <h2 id="other" className="text-lg font-semibold">
            Other tickets
          </h2>
          {extra.length > 0 ? (
            <ul className="space-y-3">
              {extra.map((row) => (
                <TicketCard key={row.type.id} row={row} />
              ))}
            </ul>
          ) : null}
          {addable.length > 0 ? (
            <form
              action="/worker/onboarding/tickets/add"
              method="get"
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-60 flex-1 space-y-2">
                <Label htmlFor="add-ticket">Add another ticket</Label>
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

        {mode === "wizard" ? (
          <div className="space-y-3">
            {missingNeeded.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                You can carry on without {missingNeeded.join(", ")} and add them
                later. Until they&apos;re verified, you won&apos;t be offered
                shifts that need them.
              </p>
            ) : null}
            <ContinueForm step="tickets" />
          </div>
        ) : null}
      </div>
    </StepFrame>
  );
}
