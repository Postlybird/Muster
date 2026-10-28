import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { WizardShell } from "@/components/wizard/wizard-shell";
import { ONBOARDING_STEPS, type OnboardingStepKey } from "@/domain/onboarding";
import { getMyWorker, hasStartedOnboarding } from "@/server/workers";

/**
 * Loads the signed-in worker for a step page. Workers who haven't started
 * (read the collection notice) are sent to the home page first.
 */
export async function loadStep() {
  const { user, worker } = await getMyWorker();
  if (worker.status === "draft" && !(await hasStartedOnboarding(user.id))) {
    redirect("/worker");
  }
  return {
    user,
    worker,
    mode: worker.status === "draft" ? ("wizard" as const) : ("edit" as const),
  };
}

/**
 * A step page: part of the wizard while onboarding, and a plain page for
 * changes once the worker has submitted.
 */
export function StepFrame({
  mode,
  step,
  completed,
  title,
  description,
  back = { href: "/worker/profile", label: "Back to profile" },
  children,
}: {
  mode: "wizard" | "edit";
  step: OnboardingStepKey;
  completed: readonly string[];
  title: string;
  description?: React.ReactNode;
  /** Where the back link goes when editing after onboarding. */
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  if (mode === "wizard") {
    return (
      <WizardShell
        steps={ONBOARDING_STEPS}
        currentKey={step}
        completedKeys={completed}
        title={title}
        description={description}
        exitHref="/worker"
        stepHref={(key) => `/worker/onboarding/${key}`}
      >
        {children}
      </WizardShell>
    );
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={back.href}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {back.label}
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
