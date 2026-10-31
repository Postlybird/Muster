import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { formatAbn } from "@/adapters/abn";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/page-header";
import { ScrollBox } from "@/components/scroll-box";
import { currentAgreement } from "@/server/agreements";
import { businessName, getMyBusiness } from "@/server/businesses";
import { signUpDetails } from "@/server/sign-up";

import { checkAbn } from "./actions";
import { ConfirmForm, type ConfirmedBusiness } from "./confirm-form";

export const metadata: Metadata = { title: "Confirm your business" };

/**
 * Business sign-up after the emailed code (owner, 01/11/2026): confirm the
 * business from the ABN they gave, accept the services agreement, done.
 */
export default async function ConfirmBusinessPage() {
  const { user, business, role } = await getMyBusiness();
  if (business && business.status !== "draft") redirect("/business");
  if (business && role !== "owner") redirect("/business");

  const [details, agreement] = await Promise.all([
    signUpDetails(),
    currentAgreement("labour_hire_services"),
  ]);

  let initial: ConfirmedBusiness | null = null;
  let initialError: string | null = null;
  if (business) {
    initial = {
      name: businessName(business),
      legalName: business.legal_name,
      abn: business.abn,
      details: [
        { label: "Legal name", value: business.legal_name },
        { label: "ABN", value: formatAbn(business.abn) },
      ],
    };
  } else if (details.abn) {
    const check = await checkAbn(details.abn);
    if (check.ok) {
      initial = {
        name: check.businessNames[0] ?? check.legalName,
        legalName: check.legalName,
        abn: check.abn,
        details: [
          { label: "Legal name", value: check.legalName },
          { label: "ABN", value: formatAbn(check.abn) },
          { label: "Type", value: check.entityType },
          ...(check.location
            ? [{ label: "Location", value: check.location }]
            : []),
          {
            label: "GST",
            value: check.gstRegisteredFrom ? "Registered" : "Not registered",
          },
        ],
      };
    } else {
      initialError = check.error;
    }
  }

  const contact =
    [details.firstName, details.lastName].filter(Boolean).join(" ") ||
    user.fullName;
  const billingNote = `Invoices go to ${contact ? `${contact} at ` : ""}${user.email ?? "your email"}, once a week. You can change this in Settings.`;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Confirm your business"
        description={
          initial
            ? "We found these details on the ABN register. Check them, accept our services agreement, and you're done. Then set up your first shift while we check your account."
            : "Enter your ABN and we'll fill in your business details from the register. Then accept our services agreement, and you're done."
        }
      />
      {agreement ? (
        <details className="rounded-lg border bg-card">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium text-primary underline-offset-4 hover:underline">
            Read the {agreement.title}
          </summary>
          <ScrollBox
            label={agreement.title}
            className="max-h-[24rem] border-t p-4"
          >
            <Markdown>{agreement.body_md}</Markdown>
          </ScrollBox>
        </details>
      ) : null}
      <ConfirmForm
        initial={initial}
        initialError={initialError}
        typedAbn={details.abn ?? ""}
        canChangeAbn={!business}
        agreementId={agreement?.id ?? null}
        billingNote={billingNote}
      />
    </div>
  );
}
