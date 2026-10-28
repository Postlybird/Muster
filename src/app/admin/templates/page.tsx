import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { templateKeys, TEMPLATES, type Audience } from "@/config/notifications";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Message templates" };

const GROUPS: { audience: Audience; title: string; how: string }[] = [
  {
    audience: "worker",
    title: "To workers",
    how: "By push notification in the app, or by text if they haven't installed it.",
  },
  { audience: "business", title: "To businesses", how: "By email." },
  { audience: "admin", title: "To our team", how: "By email." },
];

/** Every message we send (brief §5: templates editable by admin). */
export default async function TemplatesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: changed } = await supabase
    .from("notification_templates")
    .select("key");
  const edited = new Set((changed ?? []).map((row) => row.key));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Message templates"
        description="The words of every text, email and notification we send. Change one to change every message sent from then on."
      />
      {GROUPS.map((group) => (
        <section
          key={group.audience}
          aria-labelledby={`group-${group.audience}`}
          className="space-y-3"
        >
          <div className="space-y-1">
            <h2
              id={`group-${group.audience}`}
              className="text-lg font-semibold"
            >
              {group.title}
            </h2>
            <p className="text-sm text-muted-foreground">{group.how}</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>When it&apos;s sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templateKeys
                .filter((key) => TEMPLATES[key].audience === group.audience)
                .map((key) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/templates/${key}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {TEMPLATES[key].label}
                      </Link>
                      {edited.has(key) ? (
                        <Badge variant="info" className="ml-2">
                          Changed
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {TEMPLATES[key].when}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );
}
