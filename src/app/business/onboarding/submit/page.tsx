import { Check, Circle, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  BUSINESS_STEPS,
  missingBusinessSteps,
} from "@/domain/business-onboarding";
import { businessSnapshot } from "@/server/businesses";

import { BusinessStepFrame, loadBusinessStep } from "../frame";
import { SubmitBusinessForm } from "./submit-form";

export const metadata: Metadata = { title: "Check and submit" };

export default async function SubmitStepPage() {
  const { business } = await loadBusinessStep("submit");
  if (!business) return null;
  const missing = new Set(
    missingBusinessSteps(await businessSnapshot(business)),
  );
  const steps = BUSINESS_STEPS.filter((step) => step.key !== "submit");

  return (
    <BusinessStepFrame
      step="submit"
      completed={business.onboarding_steps}
      title="Check and submit"
      description="We'll review your business, usually within one business day."
    >
      <div className="max-w-xl space-y-6">
        <ul className="divide-y rounded-lg border bg-card">
          {steps.map((step) => {
            const state = missing.has(step.key)
              ? "missing"
              : business.onboarding_steps.includes(step.key)
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
                      className="size-5 text-destructive"
                      aria-hidden
                    />
                  ) : state === "done" ? (
                    <Check className="size-5 text-success" aria-hidden />
                  ) : (
                    <Circle
                      className="size-5 text-muted-foreground"
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
                          : ": optional, not done"}
                    </span>
                  </span>
                </span>
                <Link
                  href={`/business/onboarding/${step.key}`}
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
            We check your details and set up your account terms. We&apos;ll
            email you when you can post work.
          </p>
        </div>
        <SubmitBusinessForm ready={missing.size === 0} />
      </div>
    </BusinessStepFrame>
  );
}
