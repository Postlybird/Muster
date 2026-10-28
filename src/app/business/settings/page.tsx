import type { Metadata } from "next";

import { formatAbn } from "@/adapters/abn/validate";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status/status-badge";
import { formatAuPhone } from "@/lib/phone";
import { formatCalendarDate, formatDate } from "@/lib/format";
import { businessStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { currentAgreement } from "@/server/agreements";
import { getMyBusiness } from "@/server/businesses";

import { DetailsForm } from "../onboarding/details/details-form";

export const metadata: Metadata = { title: "Settings" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}

export default async function BusinessSettingsPage() {
  const { business, role } = await getMyBusiness();
  if (!business) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <p className="text-muted-foreground">Set up your business first.</p>
      </div>
    );
  }
  const agreement = await currentAgreement("labour_hire_services");
  const supabase = await createClient();
  const { data: acceptance } = agreement
    ? await supabase
        .from("agreement_acceptances")
        .select("accepted_at, profiles(full_name)")
        .eq("business_id", business.id)
        .eq("agreement_id", agreement.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Settings" />

      <section aria-labelledby="company" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="company" className="text-lg font-semibold">
            Your business
          </h2>
          <StatusBadge status={businessStatuses[business.status]} />
        </div>
        <dl className="space-y-2 rounded-lg border p-4">
          <Row label="Legal name" value={business.legal_name} />
          <Row label="ABN" value={formatAbn(business.abn)} />
          <Row label="Business type" value={business.entity_type} />
          <Row
            label="GST"
            value={
              business.gst_registered_from
                ? `Registered since ${formatCalendarDate(business.gst_registered_from)}`
                : "Not registered"
            }
          />
          <Row
            label="Register checked"
            value={formatDate(business.abr_checked_at)}
          />
          {business.status === "approved" ? (
            <Row
              label="Payment terms"
              value={
                business.account_terms_approved
                  ? `Invoices due ${business.payment_terms_days ?? 14} days after issue`
                  : "Being set up"
              }
            />
          ) : null}
        </dl>
        <p className="text-sm text-muted-foreground">
          These come from the Australian Business Register. Contact us if
          they&apos;ve changed.
        </p>
      </section>

      <section aria-labelledby="billing" className="space-y-3">
        <h2 id="billing" className="text-lg font-semibold">
          Billing contact
        </h2>
        {role === "owner" ? (
          <DetailsForm
            context="page"
            values={{
              tradingName: business.trading_name ?? "",
              contactName: business.billing_contact_name ?? "",
              contactPhone: formatAuPhone(business.billing_contact_phone),
              accountsEmail: business.accounts_email ?? "",
            }}
          />
        ) : (
          <dl className="space-y-2 rounded-lg border p-4">
            <Row label="Contact" value={business.billing_contact_name} />
            <Row
              label="Phone"
              value={formatAuPhone(business.billing_contact_phone)}
            />
            <Row label="Accounts email" value={business.accounts_email} />
          </dl>
        )}
      </section>

      {agreement ? (
        <section aria-labelledby="agreement" className="space-y-3">
          <h2 id="agreement" className="text-lg font-semibold">
            Labour Hire Services Agreement
          </h2>
          <p className="text-sm">
            Version {agreement.version}
            {acceptance
              ? `, accepted ${formatDate(acceptance.accepted_at)}${acceptance.profiles?.full_name ? ` by ${acceptance.profiles.full_name}` : ""}.`
              : ", not yet accepted."}
          </p>
          <details className="rounded-md border">
            <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
              Read the agreement
            </summary>
            <div className="max-h-96 overflow-y-auto border-t px-3 py-3">
              <Markdown>{agreement.body_md}</Markdown>
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}
