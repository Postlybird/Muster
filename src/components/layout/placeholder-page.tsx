import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { findNavItem } from "@/config/navigation";

/**
 * Stands in for a page in the plan that isn't built yet, so the layouts can
 * be clicked through. Real pages replace these as Phase 1 lands.
 */
export function PlaceholderPage({ href }: { href: string }) {
  const item = findNavItem(href);
  if (!item) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={item.label} description={item.description} />
      <EmptyState
        icon={item.icon}
        title="Not built yet"
        description={`This page arrives in Phase 1, step ${item.step} of the plan.`}
      />
    </div>
  );
}
