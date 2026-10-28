import type { Metadata } from "next";

import { formatAuPhone } from "@/lib/phone";

import { BusinessStepFrame, loadBusinessStep } from "../frame";
import { DetailsForm } from "./details-form";

export const metadata: Metadata = { title: "Billing contact" };

export default async function DetailsStepPage() {
  const { business, user } = await loadBusinessStep("details");
  if (!business) return null;
  return (
    <BusinessStepFrame
      step="details"
      completed={business.onboarding_steps}
      title="Billing contact"
      description="Who we talk to about invoices, and where they go."
    >
      <DetailsForm
        context="onboarding"
        values={{
          tradingName: business.trading_name ?? "",
          contactName: business.billing_contact_name ?? user.fullName ?? "",
          contactPhone: formatAuPhone(business.billing_contact_phone),
          accountsEmail: business.accounts_email ?? "",
        }}
      />
    </BusinessStepFrame>
  );
}
