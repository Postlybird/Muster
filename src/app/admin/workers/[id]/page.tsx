import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status/status-badge";
import { Badge } from "@/components/ui/badge";
import { reviewReasons } from "@/config/review-reasons";
import { ageOn } from "@/domain/onboarding";
import { activationBlockers } from "@/domain/verification";
import { requireAdmin } from "@/lib/auth";
import { formatCalendarDate, formatDate, sydneyDateKey } from "@/lib/format";
import { formatAuPhone } from "@/lib/phone";
import { checkStatuses, payrollStatuses, workerStatuses } from "@/lib/statuses";
import { createClient } from "@/lib/supabase/server";
import { credentialBucket } from "@/lib/uploads";
import { logAccess } from "@/server/audit";
import { getAllSettings } from "@/server/settings";

import { BASIS_LABELS, EVIDENCE_LABELS } from "@/config/worker-options";
import { LICENCE_LABELS } from "@/config/worker-options";
import { DocumentView } from "./document-view";
import {
  ActivateButton,
  IdentityReview,
  LevelsForm,
  PayrollForm,
  PhotoReview,
  RightToWorkReview,
  TicketReview,
} from "./review-forms";

export const metadata: Metadata = { title: "Worker" };

type Bucket = "worker-photos" | "identity" | "worker-docs";

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
      <dd className="[overflow-wrap:anywhere]">{value ?? "—"}</dd>
    </div>
  );
}

export default async function WorkerReviewPage({
  params,
}: PageProps<"/admin/workers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!worker) notFound();

  const [
    { data: profile },
    { data: rights },
    { data: identity },
    { data: tickets },
    { data: categories },
    { data: acceptances },
    settings,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", worker.profile_id)
      .single(),
    supabase.from("work_rights").select("*").eq("worker_id", id).maybeSingle(),
    supabase
      .from("identity_checks")
      .select("*")
      .eq("worker_id", id)
      .maybeSingle(),
    supabase
      .from("worker_credentials")
      .select("*, credential_types(name, kind, has_expiry)")
      .eq("worker_id", id)
      .is("archived_at", null)
      .order("created_at"),
    supabase
      .from("worker_categories")
      .select("category_id, years_experience, level, categories(name)")
      .eq("worker_id", id),
    supabase
      .from("agreement_acceptances")
      .select("id, accepted_at, ip, agreements(title, version)")
      .eq("profile_id", worker.profile_id)
      .order("accepted_at"),
    getAllSettings(),
  ]);

  // Short-lived links to the files on this page; viewing them is logged.
  const viewed: string[] = [];
  async function link(bucket: Bucket, path: string | null, what: string) {
    if (!path) return null;
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 300);
    if (data?.signedUrl) viewed.push(what);
    return data?.signedUrl ?? null;
  }
  const [photoUrl, evidenceUrl, idUrl, selfieUrl, ticketUrls] =
    await Promise.all([
      link("worker-photos", worker.photo_path, "photo"),
      link("identity", rights?.evidence_path ?? null, "citizenship evidence"),
      link("identity", identity?.document_path ?? null, "photo ID"),
      link("identity", identity?.selfie_path ?? null, "selfie"),
      Promise.all(
        (tickets ?? []).map((t) =>
          link(
            credentialBucket(t.credential_types?.kind ?? "ticket"),
            t.document_path,
            t.credential_types?.name ?? "ticket",
          ),
        ),
      ),
    ]);
  if (viewed.length > 0) {
    await logAccess("view_documents", "workers", worker.id, worker.profile_id, {
      documents: viewed,
    });
  }

  const today = sydneyDateKey(new Date());
  const legalName = [worker.legal_first_name, worker.legal_last_name]
    .filter(Boolean)
    .join(" ");
  const name = legalName || profile?.full_name || "Worker";
  const blockers = activationBlockers({
    status: worker.status,
    photoStatus: worker.photo_status,
    rightToWorkStatus: rights?.status ?? null,
    identityStatus: identity?.status ?? null,
    payrollStatus: worker.payroll_status,
  });
  const reviewable = (status: string | null | undefined) =>
    status === "pending" || status === "rejected";

  return (
    <div className="space-y-6">
      <Link
        href="/admin/verification"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Verification
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <StatusBadge status={workerStatuses[worker.status]} />
          </div>
          <p className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
            {[
              worker.preferred_name ? `Goes by ${worker.preferred_name}` : null,
              formatAuPhone(profile?.phone),
              profile?.email,
              worker.home_suburb,
              worker.submitted_at
                ? `Submitted ${formatDate(worker.submitted_at)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {worker.status === "pending" ? (
          blockers.length === 0 ? (
            <ActivateButton workerId={worker.id} name={name} />
          ) : (
            <p className="max-w-xs text-sm text-muted-foreground">
              To activate, finish: {blockers.join(", ")}.
            </p>
          )
        ) : null}
      </div>

      <Section
        id="photo"
        title="Photo"
        badge={
          worker.photo_status ? (
            <StatusBadge status={checkStatuses[worker.photo_status]} />
          ) : null
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="max-w-xs">
            <DocumentView url={photoUrl} label="Face photo" />
          </div>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clear, recent and only them: supervisors use it to recognise
              who&apos;s arriving.
            </p>
            {worker.photo_status === "rejected" ? (
              <p className="text-sm">
                Rejected: {worker.photo_rejection_reason}
              </p>
            ) : null}
            {worker.photo_status === "pending" ? (
              <PhotoReview
                workerId={worker.id}
                reasons={reviewReasons("photo")}
              />
            ) : null}
          </div>
        </div>
      </Section>

      <Section
        id="right-to-work"
        title="Right to work"
        badge={
          rights ? <StatusBadge status={checkStatuses[rights.status]} /> : null
        }
      >
        {rights ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <dl className="space-y-2">
                <Detail label="Basis" value={BASIS_LABELS[rights.basis]} />
                {rights.basis === "citizen" ? (
                  <Detail
                    label="Evidence"
                    value={
                      rights.citizenship_evidence
                        ? EVIDENCE_LABELS[rights.citizenship_evidence]
                        : null
                    }
                  />
                ) : (
                  <>
                    <Detail label="Passport" value={rights.passport_number} />
                    <Detail label="Country" value={rights.passport_country} />
                    <Detail
                      label="Visa grant number"
                      value={rights.visa_grant_number}
                    />
                    <Detail label="Subclass" value={rights.visa_subclass} />
                    <Detail
                      label="VEVO consent"
                      value={
                        rights.vevo_consent_at
                          ? formatDate(rights.vevo_consent_at)
                          : null
                      }
                    />
                  </>
                )}
                {rights.vevo_checked_at ? (
                  <>
                    <Detail
                      label="VEVO checked"
                      value={`${formatDate(rights.vevo_checked_at)} (${rights.vevo_reference})`}
                    />
                    <Detail
                      label="Visa expiry"
                      value={
                        rights.visa_expiry
                          ? formatCalendarDate(rights.visa_expiry)
                          : "None"
                      }
                    />
                    <Detail label="Conditions" value={rights.visa_conditions} />
                    <Detail
                      label="Hours limited"
                      value={rights.work_limit_flag ? "Yes" : "No"}
                    />
                    <Detail
                      label="Next check"
                      value={
                        rights.next_check_due
                          ? formatCalendarDate(rights.next_check_due)
                          : "Not needed"
                      }
                    />
                  </>
                ) : null}
                {rights.evidence_deleted_at ? (
                  <Detail
                    label="Document"
                    value={`Deleted after checking, ${formatDate(rights.evidence_deleted_at)}`}
                  />
                ) : null}
                {rights.status === "rejected" ? (
                  <Detail label="Rejected" value={rights.rejection_reason} />
                ) : null}
              </dl>
              {rights.basis === "citizen" && rights.evidence_path ? (
                <DocumentView url={evidenceUrl} label="Citizenship evidence" />
              ) : null}
            </div>
            <div>
              {reviewable(rights.status) ||
              (rights.status === "verified" && rights.basis !== "citizen") ? (
                <RightToWorkReview
                  workerId={worker.id}
                  reasons={reviewReasons("right_to_work")}
                  citizen={rights.basis === "citizen"}
                  recheck={rights.status === "verified"}
                  vevo={{
                    subclass: rights.visa_subclass ?? "",
                    visaExpiry: rights.visa_expiry ?? "",
                    conditions: rights.visa_conditions ?? "",
                    workLimit: rights.work_limit_flag,
                    today,
                  }}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not given yet.</p>
        )}
      </Section>

      <Section
        id="identity"
        title="Photo ID"
        badge={
          identity ? (
            <StatusBadge status={checkStatuses[identity.status]} />
          ) : null
        }
      >
        {identity ? (
          <div className="space-y-4">
            <dl className="space-y-2">
              <Detail label="Legal name" value={legalName} />
              <Detail
                label="Date of birth"
                value={
                  worker.date_of_birth
                    ? `${formatCalendarDate(worker.date_of_birth)} (age ${ageOn(worker.date_of_birth, today)})`
                    : null
                }
              />
              <Detail
                label="Document"
                value={
                  identity.document_type === "passport"
                    ? "Passport"
                    : "Driver licence"
                }
              />
              {identity.document_reference ? (
                <Detail label="Reference" value={identity.document_reference} />
              ) : null}
              {identity.images_deleted_at ? (
                <Detail
                  label="Images"
                  value={`Deleted ${formatDate(identity.images_deleted_at)}`}
                />
              ) : null}
              {identity.status === "rejected" ? (
                <Detail label="Rejected" value={identity.rejection_reason} />
              ) : null}
            </dl>
            {identity.document_path || identity.selfie_path ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <DocumentView url={idUrl} label="Photo ID" />
                <DocumentView url={selfieUrl} label="Selfie" />
              </div>
            ) : null}
            {identity.status === "pending" ? (
              <IdentityReview
                workerId={worker.id}
                reasons={reviewReasons("identity")}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not given yet.</p>
        )}
      </Section>

      <Section id="tickets" title="Tickets">
        {(tickets ?? []).length > 0 ? (
          <ul className="space-y-4">
            {(tickets ?? []).map((ticket, i) => {
              const kind = ticket.credential_types?.kind ?? "ticket";
              const expired = !!ticket.expires_on && ticket.expires_on < today;
              return (
                <li
                  key={ticket.id}
                  className="grid gap-4 rounded-lg border p-4 md:grid-cols-2"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">
                        {ticket.credential_types?.name}
                      </h3>
                      <StatusBadge status={checkStatuses[ticket.status]} />
                      {expired ? (
                        <Badge variant="warning">Past expiry</Badge>
                      ) : null}
                    </div>
                    <dl className="space-y-2">
                      <Detail label="Number" value={ticket.number} />
                      <Detail
                        label="Issued"
                        value={
                          ticket.issued_on
                            ? formatCalendarDate(ticket.issued_on)
                            : null
                        }
                      />
                      {ticket.credential_types?.has_expiry ? (
                        <Detail
                          label="Expires"
                          value={
                            ticket.expires_on
                              ? formatCalendarDate(ticket.expires_on)
                              : null
                          }
                        />
                      ) : null}
                      {ticket.verified_at ? (
                        <Detail
                          label="Verified"
                          value={formatDate(ticket.verified_at)}
                        />
                      ) : null}
                      {ticket.document_deleted_at ? (
                        <Detail
                          label="Certificate"
                          value={`Deleted after checking, ${formatDate(ticket.document_deleted_at)}`}
                        />
                      ) : null}
                      {ticket.status === "rejected" ? (
                        <Detail
                          label="Rejected"
                          value={ticket.rejection_reason}
                        />
                      ) : null}
                    </dl>
                    {ticket.document_path ? (
                      <DocumentView
                        url={ticketUrls[i] ?? null}
                        label={`${ticket.credential_types?.name ?? "Ticket"} copy`}
                      />
                    ) : null}
                  </div>
                  <div>
                    {reviewable(ticket.status) ? (
                      <TicketReview
                        workerId={worker.id}
                        credentialId={ticket.id}
                        reasons={reviewReasons(
                          kind === "police_check" ? "police_check" : "ticket",
                          settings.police_check_max_age_months,
                        )}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No tickets added.</p>
        )}
      </Section>

      <Section id="work-types" title="Work types and levels">
        {(categories ?? []).length > 0 ? (
          <LevelsForm
            workerId={worker.id}
            categories={(categories ?? []).map((row) => ({
              id: row.category_id,
              name: row.categories?.name ?? "Work type",
              years: row.years_experience,
              level: row.level,
            }))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">None chosen.</p>
        )}
        <dl className="space-y-2 border-t pt-4">
          <Detail
            label="Travel"
            value={`Up to ${worker.travel_radius_km} km from ${worker.home_suburb ?? "home"}`}
          />
          <Detail
            label="Transport"
            value={[
              worker.has_car ? "Car" : null,
              worker.licence_class && worker.licence_class !== "none"
                ? LICENCE_LABELS[worker.licence_class]
                : null,
              worker.uses_public_transport ? "Public transport" : null,
            ]
              .filter(Boolean)
              .join(", ")}
          />
          {worker.bio ? <Detail label="Bio" value={worker.bio} /> : null}
        </dl>
      </Section>

      <Section
        id="payroll"
        title="Payroll"
        badge={<StatusBadge status={payrollStatuses[worker.payroll_status]} />}
      >
        <p className="text-sm text-muted-foreground">
          Add them in Employment Hero, which emails them to collect their tax
          file number, super and bank details. Record the employee ID here, and
          mark it complete when they&apos;ve finished.
        </p>
        <PayrollForm
          workerId={worker.id}
          employeeId={worker.payroll_employee_id ?? ""}
          status={worker.payroll_status}
        />
      </Section>

      <Section id="paperwork" title="Paperwork">
        {(acceptances ?? []).length > 0 ? (
          <ul className="space-y-1 text-sm">
            {(acceptances ?? []).map((a) => (
              <li key={a.id}>
                {a.agreements?.title}{" "}
                <span className="text-muted-foreground">
                  (version {a.agreements?.version}) · accepted{" "}
                  {formatDate(a.accepted_at)}
                  {a.ip ? ` from ${a.ip}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing accepted yet.</p>
        )}
      </Section>
    </div>
  );
}
