import type { Metadata } from "next";

import { formatAbn } from "@/adapters/abn/validate";
import { formatCalendarDate, formatDate } from "@/lib/format";

import { ContinueBusinessForm } from "../continue-form";
import { BusinessStepFrame, loadBusinessStep } from "../frame";
import { AbnForm } from "./abn-form";

export const metadata: Metadata = { title: "Your ABN" };

export default async function AbnStepPage() {
  const { business } = await loadBusinessStep("abn");

  return (
    <BusinessStepFrame
      step="abn"
      completed={business?.onboarding_steps ?? []}
      title="Your ABN"
      description="Only approved businesses can post work. We start with your Australian Business Number."
    >
      {business ? (
        <div className="max-w-xl space-y-6">
          <dl className="space-y-3 rounded-lg border p-4 text-sm">
            <div className="grid grid-cols-[9rem_1fr] gap-2">
              <dt className="text-muted-foreground">ABN</dt>
              <dd className="font-medium">{formatAbn(business.abn)}</dd>
            </div>
            <div className="grid grid-cols-[9rem_1fr] gap-2">
              <dt className="text-muted-foreground">Legal name</dt>
              <dd className="font-medium">{business.legal_name}</dd>
            </div>
            <div className="grid grid-cols-[9rem_1fr] gap-2">
              <dt className="text-muted-foreground">GST</dt>
              <dd className="font-medium">
                {business.gst_registered_from
                  ? `Registered since ${formatCalendarDate(business.gst_registered_from)}`
                  : "Not registered"}
              </dd>
            </div>
            <div className="grid grid-cols-[9rem_1fr] gap-2">
              <dt className="text-muted-foreground">Checked</dt>
              <dd>{formatDate(business.abr_checked_at)}</dd>
            </div>
          </dl>
          <ContinueBusinessForm step="abn" />
        </div>
      ) : (
        <AbnForm />
      )}
    </BusinessStepFrame>
  );
}
