import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { AgreementForm } from "../agreement-form";
import { agreementKinds, type AgreementKind } from "../labels";

export const metadata: Metadata = { title: "New agreement version" };

export default async function NewAgreementPage({
  searchParams,
}: PageProps<"/admin/agreements/new">) {
  await requireAdmin();
  const params = await searchParams;
  const requested = agreementKinds.find((k) => k.kind === params.kind)?.kind;
  const kind: AgreementKind = requested ?? "labour_hire_services";

  // Start from the current wording, so a new version is an edit of it.
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("agreements")
    .select("title, body_md, jurisdiction")
    .eq("kind", kind)
    .eq("is_current", true)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <Link
        href="/admin/agreements"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All agreements
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">New version</h1>
      <p className="max-w-2xl text-muted-foreground">
        This creates a draft. Nobody sees it until you publish it.
      </p>
      <AgreementForm
        values={{
          id: null,
          kind,
          jurisdiction: current?.jurisdiction ?? null,
          version: "",
          title: current?.title ?? "",
          body_md: current?.body_md ?? "",
        }}
      />
    </div>
  );
}
