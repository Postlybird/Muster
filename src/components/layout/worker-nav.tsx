"use client";

import { workerMore, workerTabs, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

import { NavLink } from "./nav-link";

const NOTIFICATIONS = "/worker/notifications";

function UnreadCount({ unread }: { unread: number }) {
  return (
    <span className="ml-auto rounded-full bg-destructive px-2 text-xs leading-5 font-semibold text-white">
      {unread}
      <span className="sr-only"> new</span>
    </span>
  );
}

/** Every worker page, for the sidebar on tablets and computers. */
export function WorkerSideNav({ unread = 0 }: { unread?: number }) {
  const items: NavItem[] = [...workerTabs, ...workerMore];
  return (
    <nav aria-label="Main">
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink
              item={item}
              exact={item.href === "/worker"}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] text-sidebar-foreground hover:bg-accent/60"
              activeClassName="bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
            >
              <item.icon className="size-5 shrink-0" aria-hidden />
              <span>{item.label}</span>
              {item.href === NOTIFICATIONS && unread > 0 ? (
                <UnreadCount unread={unread} />
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * On phones: the pages that aren't bottom tabs, always on show under the
 * header rather than behind a menu button.
 */
export function WorkerMoreNav({
  unread = 0,
  className,
}: {
  unread?: number;
  className?: string;
}) {
  return (
    <nav aria-label="More" className={className}>
      <ul className="flex gap-1.5 overflow-x-auto px-4 pb-3">
        {workerMore.map((item) => (
          <li key={item.href} className="shrink-0">
            <NavLink
              item={item}
              className="flex h-9 items-center gap-1.5 rounded-full border bg-card px-2.5 text-sm font-medium text-foreground"
              activeClassName="border-primary bg-primary text-primary-foreground"
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
              {item.href === NOTIFICATIONS && unread > 0 ? (
                <UnreadCount unread={unread} />
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** On phones: the main pages as tabs along the bottom, in thumb reach. */
export function WorkerTabBar({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
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
