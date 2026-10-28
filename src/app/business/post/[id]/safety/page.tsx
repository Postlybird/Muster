import type { Metadata } from "next";

import { loadDraft } from "@/server/jobs";

import { PostStepFrame } from "../frame";
import { SafetyForm } from "./safety-form";

export const metadata: Metadata = { title: "Post work: safety" };

export default async function SafetyStepPage({
  params,
}: PageProps<"/business/post/[id]/safety">) {
  const { id } = await params;
  const { job, supabase } = await loadDraft(id);
  const [
    { data: hazards },
    { data: ppe },
    { data: jobHazards },
    { data: jobPpe },
  ] = await Promise.all([
    supabase
      .from("hazards")
      .select("id, name, description")
      .eq("active", true)
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("ppe_items")
      .select("id, name, description")
      .eq("active", true)
      .is("archived_at", null)
      .order("sort_order"),
    supabase.from("job_hazards").select("hazard_id").eq("job_id", job.id),
    supabase.from("job_ppe").select("ppe_item_id").eq("job_id", job.id),
  ]);

  return (
    <PostStepFrame
      jobId={job.id}
      step="safety"
      completed={job.steps}
      title="Safety"
      description="Hazards and PPE. Required before you can post."
    >
      <SafetyForm
        jobId={job.id}
        hazards={hazards ?? []}
        ppe={ppe ?? []}
        values={{
          hazardIds: (jobHazards ?? []).map((row) => row.hazard_id),
          noKnownHazards: job.no_known_hazards,
          hazardNotes: job.hazard_notes,
          hazardControls: job.hazard_controls,
          induction: job.induction,
          ppeIds: (jobPpe ?? []).map((row) => row.ppe_item_id),
          ppeSuppliedBy: job.ppe_supplied_by,
          ppeNotes: job.ppe_notes,
        }}
      />
    </PostStepFrame>
  );
}
