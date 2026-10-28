import { MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatAuPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { canManage, getMyBusiness } from "@/server/businesses";
import { getAllSettings } from "@/server/settings";

import { archiveSite } from "./actions";

export const metadata: Metadata = { title: "Sites" };

export default async function SitesPage({
  searchParams,
}: PageProps<"/business/sites">) {
  const { business, role } = await getMyBusiness();
  const { saved } = await searchParams;
  const manager = canManage(role);
  const supabase = await createClient();
  const [{ data: sites }, settings] = await Promise.all([
    business
      ? supabase
          .from("sites")
          .select(
            "*, business_user_sites(business_users(profile_id, invite_email, profiles!business_users_profile_id_fkey(full_name)))",
          )
          .eq("business_id", business.id)
          .is("archived_at", null)
          .order("name")
      : Promise.resolve({ data: [] }),
    getAllSettings(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sites"
        description="Where workers go. Workers see the suburb when offered work and the full address once booked."
        actions={
          manager && business ? (
            <Button asChild>
              <Link href="/business/sites/new">
                <Plus aria-hidden />
                Add site
              </Link>
            </Button>
          ) : undefined
        }
      />
      {saved ? (
        <Alert variant="success" className="max-w-2xl">
          <AlertDescription>Site added.</AlertDescription>
        </Alert>
      ) : null}
      {(sites ?? []).length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No sites yet"
          description={
            manager
              ? "Add the places you need workers."
              : "Your sites will appear here once the owner gives you some."
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {(sites ?? []).map((site) => {
            const supervisors = (site.business_user_sites ?? [])
              .map(
                (link) =>
                  link.business_users?.profiles?.full_name ??
                  link.business_users?.invite_email,
              )
              .filter(Boolean);
            return (
              <li
                key={site.id}
                className="space-y-3 rounded-xl border bg-card p-5"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{site.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {site.address_line1}, {site.suburb} {site.state}{" "}
                    {site.postcode}
                  </p>
                </div>
                <dl className="space-y-1 text-sm">
                  {site.access_notes ? (
                    <div>
                      <dt className="inline text-muted-foreground">Access: </dt>
                      <dd className="inline">{site.access_notes}</dd>
                    </div>
                  ) : null}
                  {site.parking_notes ? (
                    <div>
                      <dt className="inline text-muted-foreground">
                        Parking:{" "}
                      </dt>
                      <dd className="inline">{site.parking_notes}</dd>
                    </div>
                  ) : null}
                  {site.report_to_name ? (
                    <div>
                      <dt className="inline text-muted-foreground">
                        Report to:{" "}
                      </dt>
                      <dd className="inline">
                        {site.report_to_name}
                        {site.report_to_phone
                          ? `, ${formatAuPhone(site.report_to_phone)}`
                          : ""}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="inline text-muted-foreground">
                      Clock-in distance:{" "}
                    </dt>
                    <dd className="inline">
                      {site.geofence_radius_m ?? settings.geofence_radius_m} m
                    </dd>
                  </div>
                  {supervisors.length > 0 ? (
                    <div>
                      <dt className="inline text-muted-foreground">
                        Supervisors:{" "}
                      </dt>
                      <dd className="inline">{supervisors.join(", ")}</dd>
                    </div>
                  ) : null}
                </dl>
                {manager ? (
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/business/sites/${site.id}`}>
                        Edit
                        <span className="sr-only"> {site.name}</span>
                      </Link>
                    </Button>
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="sm">
                          Remove
                          <span className="sr-only"> {site.name}</span>
                        </Button>
                      }
                      title={`Remove ${site.name}?`}
                      description="It won't be offered for new work. Past jobs keep it."
                      confirmLabel="Remove"
                      action={archiveSite.bind(null, site.id)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
