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
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { CatalogueStatus } from "../status-badge";

export const metadata: Metadata = { title: "Work categories" };

export default async function CategoriesPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select(
      "id, name, police_check_required, min_engagement_hours, active, archived_at, category_credentials(credential_types(name))",
    )
    .order("archived_at", { nullsFirst: true })
    .order("sort_order");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/admin/catalogues/categories/new">
            <Plus aria-hidden />
            Add category
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Required tickets</TableHead>
            <TableHead>Police check</TableHead>
            <TableHead className="text-right">Min. hours</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(categories ?? []).map((category) => (
            <TableRow key={category.id}>
              <TableCell>
                <Link
                  href={`/admin/catalogues/categories/${category.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {category.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {category.category_credentials
                  .map((link) => link.credential_types?.name)
                  .filter(Boolean)
                  .join(", ") || "None"}
              </TableCell>
              <TableCell>
                {category.police_check_required ? "Required" : "No"}
              </TableCell>
              <TableCell className="text-right">
                {Number(category.min_engagement_hours)}
              </TableCell>
              <TableCell>
                <CatalogueStatus
                  active={category.active}
                  archivedAt={category.archived_at}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
