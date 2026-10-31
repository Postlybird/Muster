import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { suburbLabel } from "@/config/worker-options";
import { quickStartDone } from "@/domain/onboarding";
import { groupByIndustry } from "@/lib/industries";
import { createClient } from "@/lib/supabase/server";
import { getMyWorker } from "@/server/workers";

import { QuickStartForm } from "./quick-start-form";

export const metadata: Metadata = { title: "Finish signing up" };

/**
 * The worker's quick sign-up after the emailed code (owner, 01/11/2026):
 * their mobile, suburb and the work they want, then shifts near them.
 */
export default async function QuickStartPage() {
  const { user, worker } = await getMyWorker();
  if (worker.status !== "draft" || quickStartDone(worker.onboarding_steps)) {
    redirect("/worker");
  }
  const supabase = await createClient();
  const [{ data: categories }, { data: mine }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, sort_order, industries(name, sort_order, icon)")
      .eq("active", true)
      .is("archived_at", null)
      .order("sort_order")
      .order("name"),
    supabase
      .from("worker_categories")
      .select("category_id")
      .eq("worker_id", worker.id),
  ]);
  const industries = groupByIndustry(categories ?? []).map((group) => ({
    name: group.name,
    icon: group.items[0]?.industries?.icon ?? "briefcase",
    workTypes: group.items.map((item) => ({ id: item.id, name: item.name })),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-deep">
          Two quick things
        </h1>
        <p className="text-lg text-muted-foreground">
          Then you&apos;ll see shifts near you and the pay. You can add your ID
          and tickets later, in your own time.
        </p>
      </div>
      <QuickStartForm
        phone={user.phone}
        suburbLabel={suburbLabel(
          worker.home_suburb,
          worker.home_state,
          worker.home_postcode,
        )}
        radiusKm={worker.travel_radius_km}
        industries={industries}
        chosen={(mine ?? []).map((row) => row.category_id)}
      />
      <p className="text-sm text-muted-foreground">
        By continuing you agree to us collecting and using your information as
        described in our{" "}
        <Link href="/privacy#collection-notice" className="underline">
          collection notice
        </Link>
        .
      </p>
    </div>
  );
}
