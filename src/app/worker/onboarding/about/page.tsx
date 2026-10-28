import type { Metadata } from "next";

import { getAllSettings } from "@/server/settings";
import { identityVerified, signedUrl } from "@/server/workers";

import { loadStep, StepFrame } from "../step-frame";
import { AboutForm } from "./about-form";

export const metadata: Metadata = { title: "About you" };

export default async function AboutPage() {
  const { worker, mode } = await loadStep();
  const [locked, photoUrl, settings] = await Promise.all([
    identityVerified(worker.id),
    signedUrl("worker-photos", worker.photo_path),
    getAllSettings(),
  ]);

  return (
    <StepFrame
      mode={mode}
      step="about"
      completed={worker.onboarding_steps}
      title="About you"
      description="Your name as it appears on your ID, and a photo so supervisors know who's arriving."
    >
      <AboutForm
        mode={mode}
        workerId={worker.id}
        values={{
          legalFirstName: worker.legal_first_name ?? "",
          legalLastName: worker.legal_last_name ?? "",
          preferredName: worker.preferred_name ?? "",
          dateOfBirth: worker.date_of_birth,
        }}
        locked={locked}
        photo={
          worker.photo_path
            ? { path: worker.photo_path, previewUrl: photoUrl }
            : null
        }
        photoRejection={
          worker.photo_status === "rejected"
            ? (worker.photo_rejection_reason ??
              "it doesn't meet our guidelines.")
            : null
        }
        minAge={settings.min_worker_age}
      />
    </StepFrame>
  );
}
