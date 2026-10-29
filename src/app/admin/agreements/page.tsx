import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { agreementKinds } from "./labels";

export const metadata: Metadata = { title: "Agreements" };

export default async function AgreementsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: agreements }, { data: acceptances }] = await Promise.all([
    supabase
      .from("agreements")
      .select(
        "id, kind, jurisdiction, version, title, is_current, published_at, created_at",
      )
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("agreement_acceptances").select("agreement_id"),
  ]);
  const acceptanceCount = new Map<string, number>();
  for (const a of acceptances ?? []) {
    acceptanceCount.set(
      a.agreement_id,
      (acceptanceCount.get(a.agreement_id) ?? 0) + 1,
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agreements"
        description="Versioned documents. Published wording never changes; publish a new version instead. Acceptances record who, when and their IP address."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {agreementKinds.map(({ kind, label, who }) => {
          const versions = (agreements ?? []).filter((a) => a.kind === kind);
          return (
            <section
              key={kind}
              aria-labelledby={`kind-${kind}`}
              className="space-y-3 rounded-xl border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id={`kind-${kind}`} className="font-semibold">
                    {label}
                  </h2>
                  <p className="text-sm text-muted-foreground">{who}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/admin/agreements/new?kind=${kind}`}
                    aria-label={`New version of ${label}`}
                  >
                    <Plus aria-hidden />
                    New version
                  </Link>
                </Button>
              </div>
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No versions yet.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border bg-card">
                  {versions.map((version) => (
                    <li
                      key={version.id}
                      className="flex flex-wrap items-center gap-2 px-3 py-2"
                    >
                      <Link
                        href={`/admin/agreements/${version.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        Version {version.version}
                        {version.jurisdiction
                          ? ` (${version.jurisdiction})`
                          : ""}
                      </Link>
                      {version.is_current ? (
                        <Badge variant="success">Current</Badge>
                      ) : version.published_at ? (
                        <Badge variant="neutral">Published</Badge>
                      ) : (
                        <Badge variant="warning">Draft</Badge>
                      )}
                      <span className="ml-auto text-sm text-muted-foreground">
                        {version.published_at
                          ? `${formatDate(version.published_at)} · ${acceptanceCount.get(version.id) ?? 0} accepted`
                          : "Not published"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
