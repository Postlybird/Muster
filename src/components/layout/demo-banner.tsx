import Link from "next/link";

import { isDemoMode } from "@/lib/env";

/** Shown on every page while demo mode is on, so nobody mistakes it for live. */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="bg-highlight px-4 py-1.5 text-center text-xs font-medium text-highlight-foreground">
      Demo mode: texts and emails go to the{" "}
      <Link href="/dev/outbox" className="underline underline-offset-2">
        demo outbox
      </Link>
      , not real people.
    </div>
  );
}
