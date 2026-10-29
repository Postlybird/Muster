import Link from "next/link";

import { isDemoMode } from "@/lib/env";

/** Shown on every page while demo mode is on, so nobody mistakes it for live. */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="sticky top-0 z-40 flex h-(--banner-h) items-center justify-center bg-highlight-soft px-4 text-xs font-medium whitespace-nowrap text-foreground">
      <p className="truncate">
        Demo mode: messages go to the{" "}
        <Link href="/dev/outbox" className="underline underline-offset-2">
          outbox
        </Link>
        , not real people
      </p>
    </div>
  );
}
