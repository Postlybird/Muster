import { redirect } from "next/navigation";

import { resumePostStep } from "@/domain/jobs";
import { loadDraft } from "@/server/jobs";

/** Opens a draft at the first step that isn't done yet. */
export default async function ResumeDraftPage({
  params,
}: PageProps<"/business/post/[id]">) {
  const { id } = await params;
  const { job } = await loadDraft(id);
  redirect(`/business/post/${job.id}/${resumePostStep(job.steps)}`);
}
