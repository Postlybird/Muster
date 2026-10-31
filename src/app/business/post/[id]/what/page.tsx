import type { Metadata } from "next";

import { groupByIndustry } from "@/lib/industries";
import { loadDraft } from "@/server/jobs";
import { getAllSettings } from "@/server/settings";

import { emptySite, SiteForm } from "../../../sites/site-form";

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
      .select("id, name, description, industries(name, sort_order)")
      .eq("active", true)
      .is("archived_at", null)
      .order("sort_order")
      .order("name"),
  ]);

  return (
    <PostStepFrame
      jobId={job.id}
      step="what"
      completed={job.steps}
      title="What and where"
    >
      {(sites ?? []).length === 0 ? (
        // A new business adds its first site here (owner, 01/11/2026).
        <div className="max-w-2xl space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              Where do you need workers?
            </h2>
            <p className="text-muted-foreground">
              Add your site first. Workers see the suburb, and the full address
              once they&apos;re booked.
            </p>
          </div>
          <SiteForm
            values={emptySite}
            context="inline"
            defaultRadiusM={(await getAllSettings()).geofence_radius_m}
          />
        </div>
      ) : (
        <WhatForm
          jobId={job.id}
          sites={sites ?? []}
          industries={groupByIndustry(categories ?? [])}
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
