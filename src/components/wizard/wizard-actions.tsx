import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * The wizard's main button, pinned to the bottom of the screen on phones.
 * Put it inside the step's <form>; it submits that form.
 */
export function WizardActions({
  primaryLabel = "Save and continue",
  pending = false,
  pendingLabel = "Saving…",
  disabled = false,
  backHref,
  secondary,
}: {
  primaryLabel?: string;
  pending?: boolean;
  pendingLabel?: string;
  /** e.g. while a file is still uploading. */
  disabled?: boolean;
  backHref?: string | null;
  /** A lesser action, such as "Skip for now". */
  secondary?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 lg:max-w-none">
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
          size="lg"
          className="flex-1 lg:flex-none"
          disabled={pending || disabled}
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pending ? pendingLabel : primaryLabel}
        </Button>
        {secondary}
      </div>
    </div>
  );
}
