import { notFound } from "next/navigation";

import { isDemoMode } from "@/lib/env";

// Checked on every request, so switching demo mode off hides these pages
// straight away.
export const dynamic = "force-dynamic";

/** Demo-mode tools (outbox, UI kit). They don't exist outside demo mode. */
export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (!isDemoMode()) notFound();
  return children;
}
