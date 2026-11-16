import type { Metadata } from "next";

import { textsEnabled } from "@/adapters/sms";

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
      description={
        textsEnabled()
          ? "We need both a mobile number and an email address, each confirmed with a code."
          : "We need both a mobile number and an email address."
      }
    >
      <ContactForm
        mode={mode}
        phone={user.phone}
        email={user.email}
        textsOn={textsEnabled()}
      />
    </StepFrame>
  );
}
