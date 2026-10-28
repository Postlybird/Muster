import { ArrowLeft, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatAbn } from "@/adapters/abn/validate";
import { StatusBadge } from "@/components/status/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BUSINESS_ROLES } from "@/config/business-roles";
import { businessHoldReasons } from "@/config/review-reasons";
import {
  BUSINESS_STEPS,
  type BusinessStepKey,
} from "@/domain/business-onboarding";
import { requireAdmin } from "@/lib/auth";
import { formatCalendarDate, formatCents, formatDate } from "@/lib/format";
import { formatAuPhone } from "@/lib/phone";
import { businessStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { businessName } from "@/server/businesses";
import { getAllSettings } from "@/server/settings";

import {
  AccountTermsForm,
  DecisionForm,
  HoldForm,
  RecheckForm,
  ReinstateForm,
} from "./forms";

export const metadata: Metadata = { title: "Business" };

/** What each setup step means, in an admin's words. */
const SETUP_STEP_LABELS: Record<BusinessStepKey, string> = {
  abn: "ABN",
  details: "billing contact",
  sites: "a site",
  team: "team",
  agreement: "services agreement",
  submit: "submit",
};

function Section({
  id,
  title,
  badge,
  children,
}: {
  id: string;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 space-y-4 rounded-xl border bg-card p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {title}
        </h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_minmax(0,1fr)] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{value || "—"}</dd>
    </div>
  );
}

export default async function AdminBusinessPage({
  params,
}: PageProps<"/admin/businesses/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("*, approver:profiles!businesses_approved_by_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!business) notFound();

  const [
    { data: people },
    { data: sites },
    { data: acceptances },
    { data: rateCards },
    { data: billRules },
    settings,
  ] = await Promise.all([
    supabase
      .from("business_users")
      .select(
        "id, role, invite_email, accepted_at, profiles!business_users_profile_id_fkey(full_name, email, phone), business_user_sites(sites(name))",
      )
      .eq("business_id", id)
      .is("archived_at", null)
      .order("created_at"),
    supabase
      .from("sites")
      .select("*")
      .eq("business_id", id)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("agreement_acceptances")
      .select(
        "id, accepted_at, ip, agreements(title, version), profiles(full_name)",
      )
      .eq("business_id", id)
      .order("accepted_at", { ascending: false }),
    supabase
      .from("rate_cards")
      .select("id, level, base_rate_cents, effective_from, categories(name)")
      .eq("business_id", id)
      .is("archived_at", null)
      .order("effective_from", { ascending: false }),
    supabase
      .from("bill_rate_rules")
      .select(
        "id, method, margin_pct, fixed_ordinary_cents, effective_from, categories(name)",
      )
      .eq("business_id", id)
      .is("archived_at", null)
      .order("effective_from", { ascending: false }),
    getAllSettings(),
  ]);

  const name = businessName(business);
  const terms = {
    approved: business.account_terms_approved || business.status === "pending",
    days: business.payment_terms_days ?? settings.invoice_payment_terms_days,
  };
  const stepsLeft = BUSINESS_STEPS.filter(
    (step) =>
      step.key !== "submit" &&
      !("optional" in step) &&
      !business.onboarding_steps.includes(step.key),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/businesses"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Businesses
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          <StatusBadge status={businessStatuses[business.status]} />
        </div>
        <p className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
          {[
            name !== business.legal_name ? business.legal_name : null,
            `ABN ${formatAbn(business.abn)}`,
            business.submitted_at
              ? `Submitted ${formatDate(business.submitted_at)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {business.status === "pending" ? (
        <Section id="decision" title="Approval">
          <p className="text-sm text-muted-foreground">
            Check the register details, sites and agreement below. Approving
            emails the owner. A business needs account terms to post work.
          </p>
          <DecisionForm
            businessId={business.id}
            terms={terms}
            reasons={businessHoldReasons}
          />
        </Section>
      ) : null}

      {business.status === "draft" ? (
        <Section id="decision" title="Approval">
          <p className="text-sm">
            Setting up their account.{" "}
            {stepsLeft.length > 0
              ? `Still to do: ${stepsLeft.map((step) => SETUP_STEP_LABELS[step.key]).join(", ")}.`
              : "Everything's done except submitting."}
          </p>
        </Section>
      ) : null}

      {business.status === "approved" ? (
        <Section id="decision" title="Account terms">
          <p className="text-sm text-muted-foreground">
            Approved
            {business.approved_at ? ` ${formatDate(business.approved_at)}` : ""}
            {business.approver?.full_name
              ? ` by ${business.approver.full_name}`
              : ""}
            .
          </p>
          <AccountTermsForm businessId={business.id} terms={terms} />
          <details className="rounded-md border">
            <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">
              Put on hold
            </summary>
            <div className="space-y-3 border-t p-3">
              <p className="text-sm text-muted-foreground">
                They won&apos;t be able to post new work until you take them off
                hold. We email the owner your message.
              </p>
              <HoldForm
                businessId={business.id}
                reasons={businessHoldReasons}
              />
            </div>
          </details>
        </Section>
      ) : null}

      {business.status === "suspended" ? (
        <Section id="decision" title="On hold">
          {business.status_reason ? (
            <p className="text-sm">Reason given: {business.status_reason}</p>
          ) : null}
          {business.abn_status === "active" ? (
            <ReinstateForm
              businessId={business.id}
              terms={terms}
              label={business.approved_at ? "Take off hold" : "Approve"}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              The ABN is cancelled. Check the register again once the business
              says it&apos;s active.
            </p>
          )}
        </Section>
      ) : null}

      <Section
        id="register"
        title="Australian Business Register"
        badge={
          business.abn_status === "active" ? (
            <Badge variant="success">ABN active</Badge>
          ) : (
            <Badge variant="danger">ABN cancelled</Badge>
          )
        }
      >
        <dl className="space-y-2">
          <Detail label="Legal name" value={business.legal_name} />
          <Detail label="ABN" value={formatAbn(business.abn)} />
          <Detail label="ACN" value={business.acn} />
          <Detail label="Business type" value={business.entity_type} />
          <Detail
            label="ABN status"
            value={`${business.abn_status === "active" ? "Active" : "Cancelled"}${business.abn_status_from ? ` from ${formatCalendarDate(business.abn_status_from)}` : ""}`}
          />
          <Detail
            label="GST"
            value={
              business.gst_registered_from
                ? `Registered from ${formatCalendarDate(business.gst_registered_from)}`
                : "Not registered"
            }
          />
          <Detail
            label="Location"
            value={[business.abr_state, business.abr_postcode]
              .filter(Boolean)
              .join(" ")}
          />
          <Detail label="Checked" value={formatDate(business.abr_checked_at)} />
        </dl>
        <RecheckForm businessId={business.id} />
      </Section>

      <Section id="billing" title="Billing contact">
        <dl className="space-y-2">
          <Detail label="Trading name" value={business.trading_name} />
          <Detail label="Contact" value={business.billing_contact_name} />
          <Detail
            label="Phone"
            value={formatAuPhone(business.billing_contact_phone)}
          />
          <Detail label="Accounts email" value={business.accounts_email} />
        </dl>
      </Section>

      <Section id="sites" title={`Sites (${(sites ?? []).length})`}>
        {(sites ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No sites yet.</p>
        ) : (
          <ul className="space-y-3">
            {(sites ?? []).map((site) => (
              <li key={site.id} className="space-y-1 text-sm">
                <p className="font-medium">{site.name}</p>
                <p>
                  {site.address_line1}, {site.suburb} {site.state}{" "}
                  {site.postcode}
                </p>
                {site.access_notes ? (
                  <p className="text-muted-foreground">
                    Access: {site.access_notes}
                  </p>
                ) : null}
                {site.report_to_name ? (
                  <p className="text-muted-foreground">
                    Report to {site.report_to_name}
                    {site.report_to_phone
                      ? `, ${formatAuPhone(site.report_to_phone)}`
                      : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="people" title={`People (${(people ?? []).length})`}>
        <ul className="space-y-3">
          {(people ?? []).map((person) => {
            const profile = person.profiles;
            const siteNames = person.business_user_sites
              .map((link) => link.sites?.name)
              .filter(Boolean);
            return (
              <li key={person.id} className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium [overflow-wrap:anywhere]">
                    {profile?.full_name ||
                      profile?.email ||
                      person.invite_email}
                  </span>
                  <Badge variant="neutral">
                    {BUSINESS_ROLES[person.role].label}
                  </Badge>
                  {profile ? null : <Badge variant="info">Invited</Badge>}
                </div>
                <p className="[overflow-wrap:anywhere] text-muted-foreground">
                  {[
                    profile?.email ?? person.invite_email,
                    formatAuPhone(profile?.phone),
                    siteNames.length > 0
                      ? `Sites: ${siteNames.join(", ")}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section id="agreement" title="Labour Hire Services Agreement">
        {(acceptances ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Not accepted yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(acceptances ?? []).map((acceptance) => (
              <li key={acceptance.id}>
                Version {acceptance.agreements?.version} accepted{" "}
                {formatDate(acceptance.accepted_at)}
                {acceptance.profiles?.full_name
                  ? ` by ${acceptance.profiles.full_name}`
                  : ""}
                {acceptance.ip ? ` from ${String(acceptance.ip)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="rates" title="Rates for this business">
        <p className="text-sm text-muted-foreground">
          A business&apos;s own pay rate card (for example under a &ldquo;same
          job, same pay&rdquo; order) or bill rule wins over the standard ones.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Pay rate cards</h3>
            {(rateCards ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Standard rate cards.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(rateCards ?? []).map((card) => (
                  <li key={card.id}>
                    <Link
                      href={`/admin/rates/rate-cards/${card.id}`}
                      className="underline underline-offset-4"
                    >
                      {card.categories?.name}, level {card.level}
                    </Link>
                    : {formatCents(card.base_rate_cents)} base from{" "}
                    {formatCalendarDate(card.effective_from)}
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/admin/rates/rate-cards/new?business=${business.id}`}
              >
                <Plus aria-hidden />
                Add pay rate card
              </Link>
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Bill rules</h3>
            {(billRules ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Standard margin.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(billRules ?? []).map((rule) => (
                  <li key={rule.id}>
                    <Link
                      href={`/admin/rates/bill-rules/${rule.id}`}
                      className="underline underline-offset-4"
                    >
                      {rule.categories?.name ?? "All categories"}
                    </Link>
                    :{" "}
                    {rule.method === "markup"
                      ? `${Number(rule.margin_pct)}% margin`
                      : `fixed, ${formatCents(rule.fixed_ordinary_cents ?? 0)}/hr ordinary`}{" "}
                    from {formatCalendarDate(rule.effective_from)}
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/admin/rates/bill-rules/new?business=${business.id}`}
              >
                <Plus aria-hidden />
                Add bill rule
              </Link>
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
