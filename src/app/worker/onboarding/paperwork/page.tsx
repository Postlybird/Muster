import type { Metadata } from "next";

import { Markdown } from "@/components/markdown";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { EMPLOYMENT_DOCUMENTS } from "@/server/workers";

import { loadStep, StepFrame } from "../step-frame";
import { PaperworkForm, type PaperworkDocument } from "./paperwork-form";

export const metadata: Metadata = { title: "Employment paperwork" };

export default async function PaperworkPage() {
  const { user, worker, mode } = await loadStep();
  const supabase = await createClient();
  const [{ data: agreements }, { data: acceptances }] = await Promise.all([
    supabase
      .from("agreements")
      .select("id, kind, title, body_md")
      .eq("is_current", true)
      .is("jurisdiction", null)
      .in("kind", [...EMPLOYMENT_DOCUMENTS]),
    supabase
      .from("agreement_acceptances")
      .select("agreement_id, accepted_at")
      .eq("profile_id", user.id),
  ]);
  const acceptedAt = new Map(
    (acceptances ?? []).map((a) => [a.agreement_id, a.accepted_at]),
  );
  const documents: PaperworkDocument[] = (agreements ?? [])
    .sort(
      (a, b) =>
        EMPLOYMENT_DOCUMENTS.indexOf(a.kind as never) -
        EMPLOYMENT_DOCUMENTS.indexOf(b.kind as never),
    )
    .map((agreement) => {
      const accepted = acceptedAt.get(agreement.id);
      return {
        id: agreement.id,
        kind: agreement.kind,
        title: agreement.title,
        body: <Markdown>{agreement.body_md}</Markdown>,
        acceptedOn: accepted ? formatDate(accepted) : null,
      };
    });

  return (
    <StepFrame
      mode={mode}
      step="paperwork"
      completed={worker.onboarding_steps}
      title="Employment paperwork"
      description="We'll be your employer, so here's your contract and the information statements the law says you must get."
    >
      <PaperworkForm mode={mode} documents={documents} />
    </StepFrame>
  );
}
