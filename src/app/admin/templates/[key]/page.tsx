import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/forms/confirm-action";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  NOTIFICATION_CATEGORIES,
  SHARED_VALUES,
  TEMPLATES,
  type TemplateKey,
} from "@/config/notifications";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { resetTemplate, saveTemplate } from "./actions";
import { TemplateForm } from "./template-form";

export const metadata: Metadata = { title: "Message template" };

const SHARED_HELP: Record<keyof typeof SHARED_VALUES, string> = {
  brand: "Our name",
  link: "The page it's about. Put it at the end of messages to workers",
  contact: "How to reach us",
};

/** One message's wording (brief §5: templates editable by admin). */
export default async function TemplatePage({
  params,
}: PageProps<"/admin/templates/[key]">) {
  await requireAdmin();
  const { key } = await params;
  if (!(key in TEMPLATES)) notFound();
  const templateKey = key as TemplateKey;
  const template = TEMPLATES[templateKey];
  const supabase = await createClient();
  const { data: override } = await supabase
    .from("notification_templates")
    .select("title, body, updated_at, profiles(full_name)")
    .eq("key", key)
    .maybeSingle();
  const examples: Record<string, string> = {
    ...SHARED_VALUES,
    ...template.values,
  };
  const category = NOTIFICATION_CATEGORIES[template.category];

  return (
    <div className="space-y-8">
      <PageHeader
        title={template.label}
        description={
          <>
            {template.when}{" "}
            {"urgent" in template && template.urgent
              ? "Sent straight away, even in quiet hours."
              : "Waits until quiet hours end."}{" "}
            {category.critical
              ? "Always sent."
              : `People can turn off "${category.label}".`}
          </>
        }
      />
      <p className="text-sm">
        <Link href="/admin/templates" className="underline underline-offset-4">
          All message templates
        </Link>
      </p>

      <TemplateForm
        action={saveTemplate.bind(null, templateKey)}
        initial={override ?? { title: template.title, body: template.body }}
        examples={examples}
        worker={template.audience === "worker"}
      />

      <section aria-labelledby="placeholders" className="space-y-3">
        <h2 id="placeholders" className="text-lg font-semibold">
          What you can put in
        </h2>
        <p className="text-sm text-muted-foreground">
          Type a name in double curly brackets, like {"{{business}}"}, and each
          message fills it in.
        </p>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
          {Object.entries(template.values).map(([name, example]) => (
            <div key={name} className="contents">
              <dt className="font-mono">{`{{${name}}}`}</dt>
              <dd className="[overflow-wrap:anywhere] text-muted-foreground">
                For example: {example}
              </dd>
            </div>
          ))}
          {(Object.keys(SHARED_HELP) as (keyof typeof SHARED_HELP)[]).map(
            (name) => (
              <div key={name} className="contents">
                <dt className="font-mono">{`{{${name}}}`}</dt>
                <dd className="text-muted-foreground">{SHARED_HELP[name]}</dd>
              </div>
            ),
          )}
        </dl>
      </section>

      {override ? (
        <section aria-labelledby="standard" className="space-y-3">
          <h2 id="standard" className="text-lg font-semibold">
            Standard wording
          </h2>
          <p className="text-sm">
            Changed {formatDateTime(override.updated_at)}
            {override.profiles?.full_name
              ? ` by ${override.profiles.full_name}`
              : ""}
            .
          </p>
          <ConfirmAction
            trigger={
              <Button variant="outline">Use the standard wording</Button>
            }
            title="Use the standard wording?"
            description="Your changes to this message are replaced with the wording it started with."
            confirmLabel="Use the standard wording"
            action={resetTemplate.bind(null, templateKey)}
          />
        </section>
      ) : null}
    </div>
  );
}
