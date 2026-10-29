import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/forms/confirm-action";
import { Markdown } from "@/components/markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { makeAgreementCurrent, publishAgreement } from "../actions";
import { AgreementForm } from "../agreement-form";
import { agreementLabel } from "../labels";

export const metadata: Metadata = { title: "Agreement" };

export default async function AgreementPage({
  params,
}: PageProps<"/admin/agreements/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: agreement }, { count }] = await Promise.all([
    supabase.from("agreements").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("agreement_acceptances")
      .select("id", { count: "exact", head: true })
      .eq("agreement_id", id),
  ]);
  if (!agreement) notFound();
  const published = !!agreement.published_at;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/agreements"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All agreements
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {agreementLabel[agreement.kind]}
            {agreement.jurisdiction ? ` · ${agreement.jurisdiction} only` : ""}
          </p>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
            Version {agreement.version}
            {agreement.is_current ? (
              <Badge variant="success">Current</Badge>
            ) : published ? (
              <Badge variant="neutral">Published</Badge>
            ) : (
              <Badge variant="warning">Draft</Badge>
            )}
          </h1>
          {published ? (
            <p className="text-sm text-muted-foreground">
              Published {formatDateTime(agreement.published_at!)} · accepted{" "}
              {count ?? 0} {count === 1 ? "time" : "times"}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {!published ? (
            <ConfirmAction
              trigger={<Button>Publish</Button>}
              title="Publish and make current?"
              description="Its wording is frozen once published. New sign-ups will be asked to accept this version."
              confirmLabel="Publish"
              variant="default"
              action={publishAgreement.bind(null, agreement.id, true)}
            />
          ) : !agreement.is_current ? (
            <ConfirmAction
              trigger={<Button variant="outline">Make current</Button>}
              title="Make this the current version?"
              description="New sign-ups will be asked to accept this version instead."
              confirmLabel="Make current"
              variant="default"
              action={makeAgreementCurrent.bind(null, agreement.id)}
            />
          ) : null}
        </div>
      </div>

      {published ? (
        <>
          <Alert variant="info">
            <AlertDescription className="text-foreground">
              Published wording can&apos;t be changed.{" "}
              <Link
                href={`/admin/agreements/new?kind=${agreement.kind}`}
                className="underline"
              >
                Start a new version
              </Link>{" "}
              to make changes.
            </AlertDescription>
          </Alert>
          <article className="max-w-3xl rounded-xl border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">{agreement.title}</h2>
            <Markdown>{agreement.body_md}</Markdown>
          </article>
        </>
      ) : (
        <AgreementForm
          values={{
            id: agreement.id,
            kind: agreement.kind,
            jurisdiction: agreement.jurisdiction,
            version: agreement.version,
            title: agreement.title,
            body_md: agreement.body_md,
          }}
        />
      )}
    </div>
  );
}
