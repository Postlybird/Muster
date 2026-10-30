import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { formatAuPhone } from "@/lib/phone";
import { heldInState, ticketsForState } from "@/lib/state-tickets";
import { loadDraft } from "@/server/jobs";

import { PostStepFrame } from "../frame";
import { NeedsForm } from "./needs-form";

export const metadata: Metadata = {
  title: "Post work: tickets and instructions",
};

export default async function NeedsStepPage({
  params,
}: PageProps<"/business/post/[id]/needs">) {
  const { id } = await params;
  const { job, business, supabase } = await loadDraft(id);
  if (!job.category_id) redirect(`/business/post/${job.id}/what`);

  const [
    { data: category },
    { data: tickets },
    { data: chosen },
    { data: photos },
    { data: site },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "name, police_check_required, category_credentials(credential_type_id)",
      )
      .eq("id", job.category_id)
      .single(),
    supabase
      .from("credential_types")
      .select("id, name, state, family")
      .eq("active", true)
      .neq("kind", "police_check")
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("job_credentials")
      .select("credential_type_id")
      .eq("job_id", job.id),
    supabase
      .from("job_photos")
      .select("id, path")
      .eq("job_id", job.id)
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("sites")
      .select("state")
      .eq("id", job.site_id ?? "")
      .maybeSingle(),
  ]);
  // Tickets issued state by state: the site's state's versions (and any
  // other already chosen).
  const chosenIds = new Set(
    (chosen ?? []).map((row) => row.credential_type_id),
  );
  const offered = (tickets ?? []).filter(
    (ticket) => heldInState(ticket, site?.state) || chosenIds.has(ticket.id),
  );
  const usualTicketIds = ticketsForState(
    (category?.category_credentials ?? []).map(
      (link) => link.credential_type_id,
    ),
    site?.state,
    tickets ?? [],
  );
  const signed = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data } = await supabase.storage
        .from("job-photos")
        .createSignedUrl(photo.path, 600);
      return { id: photo.id, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <PostStepFrame
      jobId={job.id}
      step="needs"
      completed={job.steps}
      title="Tickets and instructions"
    >
      <NeedsForm
        jobId={job.id}
        businessId={business.id}
        categoryName={category?.name ?? "this work"}
        categoryNeedsPoliceCheck={!!category?.police_check_required}
        tickets={offered}
        usualTicketIds={usualTicketIds}
        photos={signed}
        values={{
          credentialIds: [...chosenIds],
          policeCheck: job.police_check_required,
          instructions: job.instructions,
          reportToName: job.report_to_name ?? "",
          reportToPhone: formatAuPhone(job.report_to_phone),
        }}
      />
    </PostStepFrame>
  );
}
