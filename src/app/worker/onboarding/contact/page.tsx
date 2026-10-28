import type { Metadata } from "next";

import { loadStep, StepFrame } from "../step-frame";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact details" };

export default async function ContactPage() {
  const { user, worker, mode } = await loadStep();
  return (
    <StepFrame
      mode={mode}
      step="contact"
      completed={worker.onboarding_steps}
      title="Contact details"
      description="We need both a mobile number and an email address, each confirmed with a code."
    >
      <ContactForm mode={mode} phone={user.phone} email={user.email} />
    </StepFrame>
  );
}
