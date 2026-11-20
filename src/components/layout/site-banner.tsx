import Link from "next/link";

import { launchWords } from "@/domain/launch";
import { isDemoMode } from "@/lib/env";

/**
 * The bar across the top of every page: when shifts start, while the
 * launch notice is on (owner, 20/11/2026), and in demo mode that messages
 * go to the outbox, so nobody mistakes the demo for the real thing.
 */
export function SiteBanner({ launchWhen }: { launchWhen: string | null }) {
  const demo = isDemoMode();
  if (!demo && launchWhen === null) return null;
  const words = launchWhen === null ? null : launchWords(launchWhen);
  return (
    <div
      data-site-banner
      className="sticky top-0 z-40 flex h-(--banner-h) items-center justify-center bg-highlight-soft px-4 text-xs font-medium whitespace-nowrap text-foreground"
    >
      <p className="truncate">
        {words ? (
          <>
            <span className="sm:hidden">{words.bannerShort}</span>
            <span className="hidden sm:inline">{words.banner}</span>
            {demo ? (
              <>
                {" "}
                <Link
                  href="/dev/outbox"
                  className="underline underline-offset-2"
                >
                  Demo outbox
                </Link>
              </>
            ) : null}
          </>
        ) : (
          <>
            Demo mode: messages go to the{" "}
            <Link href="/dev/outbox" className="underline underline-offset-2">
              outbox
            </Link>
            , not real people
          </>
        )}
      </p>
    </div>
  );
}
