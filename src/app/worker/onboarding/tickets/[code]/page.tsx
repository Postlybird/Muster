import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCalendarDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { loadTickets } from "@/server/tickets";

import { loadStep, StepFrame } from "../../step-frame";
import { TicketForm } from "../ticket-form";

export const metadata: Metadata = { title: "Add a ticket" };

export default async function TicketPage({
  params,
}: PageProps<"/worker/onboarding/tickets/[code]">) {
  const { code } = await params;
  const { worker, mode } = await loadStep();
  const { rows, today, policeMaxAgeMonths } = await loadTickets(
    worker.id,
    worker.home_state,
  );
  const row = rows.find((r) => r.type.code === code);
  if (!row) notFound();

  const summary = row.summary;
  let open = null;
  if (summary.state === "pending" || summary.state === "rejected") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("worker_credentials")
      .select("id, number, issued_on, expires_on, document_path")
      .eq("id", summary.openId)
      .single();
    if (data) {
      open = {
        id: data.id,
        number: data.number,
        issuedOn: data.issued_on,
        expiresOn: data.expires_on,
        documentPath: summary.state === "rejected" ? null : data.document_path,
      };
    }
  }
  const renewing =
    summary.state === "verified" ||
    summary.state === "expired" ||
    ((summary.state === "pending" || summary.state === "rejected") &&
      summary.verifiedUntil !== null);

  return (
    <StepFrame
      mode={mode}
      step="tickets"
      completed={worker.onboarding_steps}
      title={renewing ? `${row.type.name}: renewal` : row.type.name}
      description={row.type.description || undefined}
      back={{ href: "/worker/onboarding/tickets", label: "Back to tickets" }}
    >
      <div className="space-y-6">
        {summary.state === "rejected" ? (
          <Alert variant="destructive" className="max-w-xl">
            <AlertDescription className="text-foreground">
              This needs fixing: {summary.reason ?? "please check the details."}
            </AlertDescription>
          </Alert>
        ) : null}
        {summary.state === "verified" ? (
          <Alert variant="info" className="max-w-xl">
            <AlertDescription>
              Your current one is verified
              {summary.validUntil
                ? ` until ${formatCalendarDate(summary.validUntil)}`
                : ""}
              . Add the renewed one here: we&apos;ll keep using the current one
              until we&apos;ve checked it.
            </AlertDescription>
          </Alert>
        ) : null}
        <TicketForm
          mode={mode}
          workerId={worker.id}
          type={row.type}
          open={open}
          today={today}
          policeMaxAgeMonths={policeMaxAgeMonths}
        />
      </div>
    </StepFrame>
  );
}
