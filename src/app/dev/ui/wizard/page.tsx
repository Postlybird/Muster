import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WizardShell, type WizardStep } from "@/components/wizard/wizard-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = {
  title: "Wizard example",
  robots: { index: false },
};

// The worker onboarding steps from BRIEF.md §4.1.
const steps: WizardStep[] = [
  { key: "profile", title: "Your details" },
  { key: "right-to-work", title: "Right to work" },
  { key: "identity", title: "Photo ID" },
  { key: "work-types", title: "Work types" },
  { key: "tickets", title: "Tickets" },
  { key: "police-check", title: "Police check", optional: true },
  { key: "availability", title: "Availability" },
  { key: "paperwork", title: "Employment paperwork" },
  { key: "submit", title: "Check and submit" },
];

/** Demo mode only: the wizard layout with a sample step. */
export default function WizardExamplePage() {
  if (!isDemoMode()) notFound();
  return (
    <main className="flex-1 px-4 py-8">
      <WizardShell
        steps={steps}
        currentKey="right-to-work"
        completedKeys={["profile"]}
        title="Right to work"
        description="We need to confirm you're allowed to work in Australia."
        formId="example-step"
        backHref="/dev/ui/wizard"
        exitHref="/dev/ui"
        stepHref={() => "/dev/ui/wizard"}
      >
        <form id="example-step" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passport">Passport number</Label>
            <Input id="passport" autoComplete="off" />
          </div>
        </form>
      </WizardShell>
    </main>
  );
}
