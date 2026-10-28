import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type WizardStep = { key: string; title: string; optional?: boolean };

type Props = {
  steps: WizardStep[];
  currentKey: string;
  completedKeys?: string[];
  title: string;
  description?: React.ReactNode;
  /** The step's <form id>. The main button submits it. */
  formId: string;
  primaryLabel?: string;
  backHref?: string;
  /** Leave and come back later. Each step saves on "continue". */
  exitHref?: string;
  /** Builds the link for each step in the side list (desktop). */
  stepHref?: (key: string) => string;
  children: React.ReactNode;
};

/**
 * Layout for multi-step flows (worker onboarding, posting work): one main
 * action per screen, progress always visible, resumable at any point.
 */
export function WizardShell({
  steps,
  currentKey,
  completedKeys = [],
  title,
  description,
  formId,
  primaryLabel = "Save and continue",
  backHref,
  exitHref,
  stepHref,
  children,
}: Props) {
  const index = Math.max(
    0,
    steps.findIndex((s) => s.key === currentKey),
  );
  const current = steps[index];
  const done = new Set(completedKeys);
  const percent = Math.round((done.size / steps.length) * 100);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[16rem_1fr]">
      <nav aria-label="Steps" className="hidden lg:block">
        <ol className="space-y-1">
          {steps.map((step, i) => {
            const isCurrent = step.key === currentKey;
            const isDone = done.has(step.key);
            const content = (
              <>
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    isDone &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent && !isDone && "border-primary text-primary",
                  )}
                  aria-hidden
                >
                  {isDone ? <Check className="size-4" /> : i + 1}
                </span>
                <span className="flex flex-col">
                  <span>{step.title}</span>
                  {step.optional ? (
                    <span className="text-xs text-muted-foreground">
                      Optional
                    </span>
                  ) : null}
                </span>
                {isDone ? <span className="sr-only">(done)</span> : null}
              </>
            );
            const itemClass = cn(
              "flex items-center gap-3 rounded-md px-2 py-2 text-sm",
              isCurrent
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground",
            );
            return (
              <li key={step.key}>
                {stepHref && !isCurrent ? (
                  <Link
                    href={stepHref(step.key)}
                    className={cn(itemClass, "hover:bg-muted")}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    className={itemClass}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-w-0 space-y-6 pb-28 lg:pb-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="font-medium text-muted-foreground">
              Step {index + 1} of {steps.length}
              {current?.optional ? " · optional" : null}
            </p>
            {exitHref ? (
              <Link
                href={exitHref}
                className="text-muted-foreground underline underline-offset-4"
              >
                Finish later
              </Link>
            ) : null}
          </div>
          <Progress value={percent} aria-label={`${percent}% complete`} />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {children}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="mx-auto flex max-w-5xl gap-3 lg:max-w-none">
            {backHref ? (
              <Button asChild variant="outline" size="lg" className="shrink-0">
                <Link href={backHref}>
                  <ArrowLeft aria-hidden />
                  <span className="sr-only sm:not-sr-only">Back</span>
                </Link>
              </Button>
            ) : null}
            <Button
              type="submit"
              form={formId}
              size="lg"
              className="flex-1 lg:flex-none"
            >
              {primaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
