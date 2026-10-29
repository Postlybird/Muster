"use client";

import { workerTabs } from "@/config/navigation";

import { NavLink } from "./nav-link";

export function WorkerTabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {workerTabs.map((item) => (
          <li key={item.href}>
            <NavLink
              item={item}
              exact={item.href === "/worker"}
              className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium text-muted-foreground"
              activeClassName="font-semibold text-primary"
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
