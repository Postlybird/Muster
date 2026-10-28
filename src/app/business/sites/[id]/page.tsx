import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { formatAuPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { canManage, getMyBusiness } from "@/server/businesses";
import { getAllSettings } from "@/server/settings";

import { SiteForm } from "../site-form";

export const metadata: Metadata = { title: "Edit site" };

export default async function EditSitePage({
  params,
}: PageProps<"/business/sites/[id]">) {
  const { id } = await params;
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) redirect("/business/sites");
  const supabase = await createClient();
  const [{ data: site }, settings] = await Promise.all([
    supabase
      .from("sites")
      .select("*")
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle(),
    getAllSettings(),
  ]);
  if (!site) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/business/sites"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All sites
      </Link>
      <PageHeader title={site.name} />
      <SiteForm
        context="page"
        defaultRadiusM={settings.geofence_radius_m}
        values={{
          id: site.id,
          name: site.name,
          addressLabel: `${site.address_line1}, ${site.suburb} ${site.state} ${site.postcode}`,
          accessNotes: site.access_notes ?? "",
          parkingNotes: site.parking_notes ?? "",
          reportToName: site.report_to_name ?? "",
          reportToPhone: formatAuPhone(site.report_to_phone),
          geofenceRadiusM: site.geofence_radius_m
            ? String(site.geofence_radius_m)
            : "",
        }}
      />
    </div>
  );
}
