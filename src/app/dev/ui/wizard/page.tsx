import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WizardActions } from "@/components/wizard/wizard-actions";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ONBOARDING_STEPS } from "@/domain/onboarding";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = {
  title: "Wizard example",
  robots: { index: false },
};

/** Demo mode only: the wizard layout with a sample step. */
export default function WizardExamplePage() {
  if (!isDemoMode()) notFound();
  return (
    <main className="flex-1 px-4 py-8">
      <WizardShell
        steps={ONBOARDING_STEPS}
        currentKey="right-to-work"
        completedKeys={["about", "contact", "travel"]}
        title="Right to work"
        description="We need to confirm you're allowed to work in Australia."
        exitHref="/dev/ui"
        stepHref={() => "/dev/ui/wizard"}
      >
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passport">Passport number</Label>
            <Input id="passport" autoComplete="off" />
          </div>
          <WizardActions backHref="/dev/ui/wizard" />
        </form>
      </WizardShell>
    </main>
  );
}
