import { Briefcase, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { WhatsNext } from "@/components/status/whats-next";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { businessStatuses } from "@/lib/statuses";

export const metadata: Metadata = { title: "Dashboard" };

export default async function BusinessDashboardPage() {
  await requireRole("business_user");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Today's shifts, fill status and timesheets to approve."
        actions={
          <Button asChild>
            <Link href="/business/post">
              <Plus aria-hidden />
              Post work
            </Link>
          </Button>
        }
      />

      {/* Phase 1 (step 1.4) replaces this with the real business status. */}
      <WhatsNext
        title="Your business account"
        status={businessStatuses.draft}
      />

      <EmptyState
        icon={Briefcase}
        title="No shifts today"
        description="Shifts you post will show here with how many workers are confirmed."
      />
    </div>
  );
}
