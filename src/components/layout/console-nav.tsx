"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  adminNav,
  businessNav,
  businessPostWork,
  type NavGroup,
} from "@/config/navigation";
import { cn } from "@/lib/utils";

import { NavLink } from "./nav-link";
import { SignOutButton } from "./sign-out-button";

const navFor: Record<"business" | "admin", NavGroup[]> = {
  business: businessNav,
  admin: adminNav,
};

export function ConsoleNav({
  area,
  onNavigate,
}: {
  area: "business" | "admin";
  onNavigate?: () => void;
}) {
  const groups = navFor[area];
  return (
    <nav aria-label="Main" className="space-y-5">
      {area === "business" ? (
        <NavLink
          item={businessPostWork}
          onNavigate={onNavigate}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        />
      ) : null}
      {groups.map((group, i) => (
        <div key={group.label ?? i} className="space-y-1">
          {group.label ? (
            <p className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  exact={item.href === `/${area}`}
                  onNavigate={onNavigate}
                  className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground hover:bg-accent/60"
                  activeClassName="bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * On phones: every page in a row under the header, always on show (no
 * menu button). It scrolls sideways, starting at the current page.
 */
export function ConsoleStripNav({ area }: { area: "business" | "admin" }) {
  const items = [
    ...(area === "business" ? [businessPostWork] : []),
    ...navFor[area].flatMap((group) => group.items),
  ];
  const listRef = useRef<HTMLUListElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const current = listRef.current?.querySelector('[aria-current="page"]');
    current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);
  return (
    <nav aria-label="Main">
      <ul ref={listRef} className="flex gap-2 overflow-x-auto px-4 pb-3">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <NavLink
              item={item}
              exact={item.href === `/${area}`}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium [&>svg]:size-4",
                item === businessPostWork
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-foreground",
              )}
              activeClassName="border-deep bg-deep text-deep-foreground"
            />
          </li>
        ))}
        <li className="shrink-0">
          <SignOutButton />
        </li>
      </ul>
    </nav>
  );
}
