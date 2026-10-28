import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { canManage, getMyBusiness } from "@/server/businesses";
import { getAllSettings } from "@/server/settings";

import { emptySite, SiteForm } from "../site-form";

export const metadata: Metadata = { title: "Add a site" };

export default async function NewSitePage() {
  const { business, role } = await getMyBusiness();
  if (!business || !canManage(role)) redirect("/business/sites");
  const settings = await getAllSettings();
  return (
    <div className="space-y-4">
      <Link
        href="/business/sites"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All sites
      </Link>
      <PageHeader title="Add a site" />
      <SiteForm
        values={emptySite}
        context="page"
        defaultRadiusM={settings.geofence_radius_m}
      />
    </div>
  );
}
