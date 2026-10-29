import { Check, Circle, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ONBOARDING_STEPS } from "@/domain/onboarding";
import { missingOnboardingSteps } from "@/server/workers";

import { loadStep, StepFrame } from "../step-frame";
import { SubmitForm } from "./submit-form";

export const metadata: Metadata = { title: "Check and submit" };

export default async function SubmitPage() {
  const { user, worker, mode } = await loadStep();
  if (mode === "edit") redirect("/worker");
  const missing = new Set(await missingOnboardingSteps(user, worker));
  const steps = ONBOARDING_STEPS.filter((step) => step.key !== "submit");

  return (
    <StepFrame
      mode={mode}
      step="submit"
      completed={worker.onboarding_steps}
      title="Check and submit"
      description="Make sure everything's there, then send it to us to check."
    >
      <div className="max-w-xl space-y-6">
        <ul className="divide-y rounded-lg border bg-card">
          {steps.map((step) => {
            const state = missing.has(step.key)
              ? "missing"
              : worker.onboarding_steps.includes(step.key)
                ? "done"
                : "skipped";
            const link = { missing: "Finish", done: "Change", skipped: "Add" }[
              state
            ];
            return (
              <li
                key={step.key}
                className="flex items-center justify-between gap-3 p-3"
              >
                <span className="flex items-center gap-3">
                  {state === "missing" ? (
                    <CircleAlert
                      className="size-5 shrink-0 text-destructive"
                      aria-hidden
                    />
                  ) : state === "done" ? (
                    <Check
                      className="size-5 shrink-0 text-success"
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="size-5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <span>
                    {step.title}
                    <span className="sr-only">
                      {state === "missing"
                        ? ": not finished"
                        : state === "done"
                          ? ": done"
                          : ": optional, not added"}
                    </span>
                    {state === "skipped" ? (
                      <span
                        className="block text-sm text-muted-foreground"
                        aria-hidden
                      >
                        Optional
                      </span>
                    ) : null}
                  </span>
                </span>
                <Link
                  href={`/worker/onboarding/${step.key}`}
                  className="min-h-11 content-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                  aria-label={`${link} ${step.title}`}
                >
                  {link}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium">What happens next</p>
          <p>
            We check your ID, right to work and tickets, usually within two
            business days, and text you when it&apos;s done. Then our payroll
            provider emails you to set up pay.
          </p>
          <p>
            By submitting, you confirm the details you&apos;ve given are true
            and correct.
          </p>
        </div>

        <SubmitForm ready={missing.size === 0} />
      </div>
    </StepFrame>
  );
}
