import { Inbox } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboardPage() {
  await requireRole("admin");
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="What needs attention today." />
      <EmptyState
        icon={Inbox}
        title="Nothing needs attention"
        description="Verifications, unfilled shifts, disputes and safety reports will appear here."
      />
    </div>
  );
}
