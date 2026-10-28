import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { loadDraft } from "@/server/jobs";

import { PostStepFrame } from "../frame";
import { WhatForm } from "./what-form";

export const metadata: Metadata = { title: "Post work: what and where" };

export default async function WhatStepPage({
  params,
}: PageProps<"/business/post/[id]/what">) {
  const { id } = await params;
  const { job, business, supabase } = await loadDraft(id);
  const [{ data: sites }, { data: categories }] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, suburb")
      .eq("business_id", business.id)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("categories")
      .select("id, name, description")
      .eq("active", true)
      .is("archived_at", null)
      .order("sort_order"),
  ]);

  return (
    <PostStepFrame
      jobId={job.id}
      step="what"
      completed={job.steps}
      title="What and where"
    >
      {(sites ?? []).length === 0 ? (
        <div className="max-w-xl space-y-4">
          <p>Add the site where you need workers first.</p>
          <Button asChild>
            <Link href="/business/sites/new">Add a site</Link>
          </Button>
        </div>
      ) : (
        <WhatForm
          jobId={job.id}
          sites={sites ?? []}
          categories={categories ?? []}
          values={{
            type: job.type,
            siteId:
              job.site_id ?? ((sites ?? []).length === 1 ? sites![0]!.id : ""),
            categoryId: job.category_id ?? "",
            headcount: String(job.headcount),
          }}
        />
      )}
    </PostStepFrame>
  );
}
