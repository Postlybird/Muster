import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import { getMyWorker } from "@/server/workers";

import { SafetyForm } from "./safety-form";

export const metadata: Metadata = { title: "Report a safety issue" };

/** "Report a safety issue" from a shift (brief §4.6). */
export default async function SafetyReportPage({
  params,
  searchParams,
}: PageProps<"/worker/shifts/[id]/safety">) {
  const { id } = await params;
  const { booking } = await searchParams;
  const { worker } = await getMyWorker();
  const supabase = await createClient();
  const { data: mine } = await supabase.rpc("my_shifts", { p_job_id: id });
  const shift = (mine ?? []).find(
    (row) => row.assignment_id && row.assignment_id === booking,
  );
  if (!shift?.assignment_id) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/worker/shifts/${id}`}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to the shift
      </Link>
      <PageHeader
        title="Report a safety issue"
        description={`${shift.category_name} for ${shift.business_name}. It goes straight to our team.`}
      />
      <Alert variant="destructive">
        <AlertDescription className="text-foreground">
          If anyone is in danger or hurt, call 000 first.
        </AlertDescription>
      </Alert>
      <SafetyForm
        jobId={id}
        assignmentId={shift.assignment_id}
        workerId={worker.id}
      />
    </div>
  );
}
