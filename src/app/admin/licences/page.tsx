import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireAdmin } from "@/lib/auth";
import { sydneyDateKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { JurisdictionRow, LicenceForm } from "./licence-forms";

export const metadata: Metadata = { title: "Licences" };

export default async function LicencesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: jurisdictions }, { data: licences }] = await Promise.all([
    supabase.from("jurisdictions").select("*").order("code"),
    supabase
      .from("licences")
      .select("*")
      .is("archived_at", null)
      .order("jurisdiction"),
  ]);

  const today = sydneyDateKey(new Date());
  const held = new Set(
    (licences ?? [])
      .filter(
        (l) =>
          l.status === "active" && (!l.expires_on || l.expires_on >= today),
      )
      .map((l) => l.jurisdiction),
  );
  const blocked = (jurisdictions ?? []).filter(
    (j) => j.licence_required && !held.has(j.code),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Labour hire licences"
        description="Where a state requires a labour hire licence, jobs there are blocked until we hold a current one."
      />

      {blocked.length > 0 ? (
        <Alert variant="warning">
          <AlertTitle>
            Jobs are blocked in {blocked.map((j) => j.code).join(", ")}
          </AlertTitle>
          <AlertDescription>
            These states require a labour hire licence and we don&apos;t have a
            current one on file.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="our-licences" className="space-y-4">
        <h2 id="our-licences" className="text-lg font-semibold">
          Our licences
        </h2>
        {(licences ?? []).length === 0 ? (
          <p className="text-muted-foreground">No licences recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {(licences ?? []).map((licence) => (
              <li key={licence.id}>
                <LicenceForm
                  values={{
                    id: licence.id,
                    jurisdiction: licence.jurisdiction,
                    licence_number: licence.licence_number,
                    holder_name: licence.holder_name,
                    issued_on: licence.issued_on ?? "",
                    expires_on: licence.expires_on ?? "",
                    status: licence.status,
                    notes: licence.notes,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-xl border bg-card p-4">
          <summary className="cursor-pointer font-medium">
            Add a licence
          </summary>
          <div className="pt-4">
            <LicenceForm
              values={{
                id: null,
                jurisdiction: "",
                licence_number: "",
                holder_name: "",
                issued_on: "",
                expires_on: "",
                status: "active",
                notes: "",
              }}
            />
          </div>
        </details>
      </section>

      <section aria-labelledby="states" className="space-y-4">
        <h2 id="states" className="text-lg font-semibold">
          States and territories
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Keep these in step with each state&apos;s law. Change them when a
          state introduces or changes its scheme (e.g. the promised NSW scheme).
        </p>
        <ul className="space-y-3">
          {(jurisdictions ?? []).map((j) => (
            <li key={j.code}>
              <JurisdictionRow
                values={{
                  code: j.code,
                  name: j.name,
                  licence_required: j.licence_required,
                  worker_notice_required: j.worker_notice_required,
                  show_licence_on_invoice: j.show_licence_on_invoice,
                  licensing_body: j.licensing_body ?? "",
                  notes: j.notes,
                }}
                licensed={held.has(j.code)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
