import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { formatAbn } from "@/adapters/abn/validate";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { businessStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { businessName } from "@/server/businesses";

export const metadata: Metadata = { title: "Businesses" };

const STATUS_ORDER = ["approved", "suspended", "draft"] as const;

export default async function AdminBusinessesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select(
      "id, abn, legal_name, trading_name, status, abn_status, submitted_at, approved_at, account_terms_approved, payment_terms_days, created_at, sites(count)",
    )
    .is("archived_at", null)
    .is("sites.archived_at", null);
  const businesses = (data ?? []).map((business) => ({
    ...business,
    name: businessName(business),
    siteCount: business.sites[0]?.count ?? 0,
  }));
  const waiting = businesses
    .filter((business) => business.status === "pending")
    .sort((a, b) => (a.submitted_at ?? "").localeCompare(b.submitted_at ?? ""));
  const others = businesses
    .filter((business) => business.status !== "pending")
    .sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status as (typeof STATUS_ORDER)[number]) -
          STATUS_ORDER.indexOf(b.status as (typeof STATUS_ORDER)[number]) ||
        a.name.localeCompare(b.name),
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Businesses"
        description="Approve new businesses and set their account terms. Oldest first."
      />

      {businesses.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No businesses yet"
          description="Businesses appear here once they start signing up."
        />
      ) : null}

      <section aria-labelledby="waiting" className="space-y-3">
        <h2 id="waiting" className="text-lg font-semibold">
          Awaiting approval ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing waiting. New sign-ups appear here once they submit.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>ABN</TableHead>
                <TableHead>Sites</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waiting.map((business) => (
                <TableRow key={business.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/businesses/${business.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {business.name}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatAbn(business.abn)}
                    {business.abn_status === "cancelled" ? (
                      <Badge variant="danger" className="ml-2">
                        Cancelled
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{business.siteCount}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {business.submitted_at
                      ? formatDate(business.submitted_at)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {others.length > 0 ? (
        <section aria-labelledby="all" className="space-y-3">
          <h2 id="all" className="text-lg font-semibold">
            Other businesses ({others.length})
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Account terms</TableHead>
                <TableHead>ABN</TableHead>
                <TableHead>Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {others.map((business) => (
                <TableRow key={business.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/businesses/${business.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {business.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={businessStatuses[business.status]} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {business.status !== "approved"
                      ? "—"
                      : business.account_terms_approved
                        ? `${business.payment_terms_days ?? 0} days`
                        : "Not yet"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatAbn(business.abn)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(business.approved_at ?? business.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}
    </div>
  );
}
