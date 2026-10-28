import type { Metadata } from "next";

import { formatAbn } from "@/adapters/abn/validate";
import { Markdown } from "@/components/markdown";
import { ScrollBox } from "@/components/scroll-box";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/components/status/status-badge";
import { formatAuPhone } from "@/lib/phone";
import { formatCalendarDate, formatDate } from "@/lib/format";
import { businessStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { currentAgreement } from "@/server/agreements";
import { getMyBusiness } from "@/server/businesses";

import { AgreementForm } from "../onboarding/agreement/agreement-form";
import { DetailsForm } from "../onboarding/details/details-form";

export const metadata: Metadata = { title: "Settings" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_minmax(0,1fr)] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{value ?? "—"}</dd>
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
  // The newest acceptance, which may be of an earlier version.
  const { data: latest } = await supabase
    .from("agreement_acceptances")
    .select(
      "agreement_id, accepted_at, agreements!inner(version, kind), profiles(full_name)",
    )
    .eq("business_id", business.id)
    .eq("agreements.kind", "labour_hire_services")
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const acceptedCurrent = !!agreement && latest?.agreement_id === agreement.id;
  const acceptedBy = latest?.profiles?.full_name
    ? ` by ${latest.profiles.full_name}`
    : "";

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
          {acceptedCurrent && latest ? (
            <>
              <p className="text-sm">
                Version {agreement.version}, accepted{" "}
                {formatDate(latest.accepted_at)}
                {acceptedBy}.
              </p>
              <details className="rounded-md border">
                <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Read the agreement
                </summary>
                <ScrollBox
                  label={agreement.title}
                  className="max-h-96 border-t px-3 py-3"
                >
                  <Markdown>{agreement.body_md}</Markdown>
                </ScrollBox>
              </details>
            </>
          ) : (
            <>
              <Alert variant="warning">
                <AlertDescription className="text-foreground">
                  {latest
                    ? `We've updated the agreement to version ${agreement.version}. You accepted version ${latest.agreements.version} on ${formatDate(latest.accepted_at)}${acceptedBy}.`
                    : `Version ${agreement.version} hasn't been accepted yet.`}{" "}
                  {role === "owner"
                    ? "Read it, then accept it below."
                    : "Your account owner needs to accept it."}
                </AlertDescription>
              </Alert>
              <ScrollBox
                label={agreement.title}
                className="max-h-96 rounded-lg border p-4"
              >
                <Markdown>{agreement.body_md}</Markdown>
              </ScrollBox>
              {role === "owner" ? (
                <AgreementForm
                  agreementId={agreement.id}
                  legalName={business.legal_name}
                  context="page"
                />
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
