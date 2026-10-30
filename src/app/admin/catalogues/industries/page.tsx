import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IndustryIcon } from "@/components/industries/industry-icon";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { CatalogueStatus } from "../status-badge";

export const metadata: Metadata = { title: "Industries" };

export default async function IndustriesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: industries } = await supabase
    .from("industries")
    .select("id, name, summary, icon, active, archived_at, categories(count)")
    .order("archived_at", { nullsFirst: true })
    .order("sort_order");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">
          Work categories are grouped by industry, and each active industry has
          a page on the website.
        </p>
        <Button asChild>
          <Link href="/admin/catalogues/industries/new">
            <Plus aria-hidden />
            Add industry
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Industry</TableHead>
            <TableHead>On the website</TableHead>
            <TableHead className="text-right">Work types</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(industries ?? []).map((industry) => {
            return (
              <TableRow key={industry.id}>
                <TableCell>
                  <Link
                    href={`/admin/catalogues/industries/${industry.id}`}
                    className="inline-flex items-center gap-2 font-medium underline-offset-4 hover:underline"
                  >
                    <IndustryIcon
                      name={industry.icon}
                      className="size-4 text-primary"
                    />
                    {industry.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {industry.summary}
                </TableCell>
                <TableCell className="text-right">
                  {industry.categories[0]?.count ?? 0}
                </TableCell>
                <TableCell>
                  <CatalogueStatus
                    active={industry.active}
                    archivedAt={industry.archived_at}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
