"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A thin orange bar across the top while the next page loads. Links move
 * between pages without a full reload (Next.js swaps the content in), so
 * the browser shows no loading of its own. The bar starts when someone
 * taps a link to another page and finishes when that page arrives; quick
 * navigations never show it.
 */

/** Wait this long before showing it, so instant navigations don't flash. */
const SHOW_AFTER_MS = 150;
/** Give up on a navigation that never arrives (failed or cancelled). */
const GIVE_UP_AFTER_MS = 15_000;

/** Whether this click follows a link to another page on this site. */
function isPageLink(event: MouseEvent): boolean {
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false; // a new tab or window
  }
  const target = event.target;
  const link = target instanceof Element ? target.closest("a[href]") : null;
  if (!(link instanceof HTMLAnchorElement)) return false;
  if (
    (link.target && link.target !== "_self") ||
    link.hasAttribute("download")
  ) {
    return false;
  }
  const to = new URL(link.href, window.location.href);
  if (to.origin !== window.location.origin) return false;
  // The same page, or a jump to a section of it.
  return (
    to.pathname + to.search !==
    window.location.pathname + window.location.search
  );
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // How far along the bar is (0 to 1), or null while it's hidden.
  const [progress, setProgress] = useState<number | null>(null);
  const shown = useRef(false);
  const timers = useRef<{
    show?: number;
    trickle?: number;
    giveUp?: number;
    hide?: number;
  }>({});

  const finish = useCallback(() => {
    const t = timers.current;
    window.clearTimeout(t.show);
    window.clearInterval(t.trickle);
    window.clearTimeout(t.giveUp);
    if (!shown.current) return;
    shown.current = false;
    setProgress(1);
    t.hide = window.setTimeout(() => setProgress(null), 450);
  }, []);

  const start = useCallback(() => {
    const t = timers.current;
    window.clearTimeout(t.show);
    window.clearInterval(t.trickle);
    window.clearTimeout(t.giveUp);
    window.clearTimeout(t.hide);
    t.show = window.setTimeout(() => {
      shown.current = true;
      setProgress(0.1);
      // Creeps towards 90% until the page arrives.
      t.trickle = window.setInterval(
        () => setProgress((p) => (p === null ? p : p + (0.9 - p) * 0.08)),
        250,
      );
    }, SHOW_AFTER_MS);
    t.giveUp = window.setTimeout(finish, GIVE_UP_AFTER_MS);
  }, [finish]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isPageLink(event)) start();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [start]);

  // The new page (or new filters on this one) has arrived.
  useEffect(() => {
    finish();
  }, [pathname, searchParams, finish]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      window.clearTimeout(t.show);
      window.clearInterval(t.trickle);
      window.clearTimeout(t.giveUp);
      window.clearTimeout(t.hide);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="navigation-progress"
      // Under the demo banner, if there is one, so it shows against the header.
      className="pointer-events-none fixed inset-x-0 top-(--banner-h) z-[100] h-[3px]"
    >
      {progress === null ? null : (
        <div
          className="h-full origin-left bg-highlight motion-reduce:transition-none"
          style={{
            transform: `scaleX(${progress})`,
            opacity: progress === 1 ? 0 : 1,
            transition:
              progress === 1
                ? "transform 200ms ease-out, opacity 250ms ease 200ms"
                : "transform 250ms linear",
          }}
        />
      )}
    </div>
  );
}
