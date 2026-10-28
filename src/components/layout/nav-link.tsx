"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

/** A nav link that marks itself as the current page for screen readers too. */
export function NavLink({
  item,
  exact = false,
  className,
  activeClassName,
  onNavigate,
  children,
}: {
  item: NavItem;
  exact?: boolean;
  className?: string;
  activeClassName?: string;
  onNavigate?: () => void;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href, exact);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(className, active && activeClassName)}
      onClick={onNavigate}
    >
      {children ?? (
        <>
          <Icon className="size-5 shrink-0" aria-hidden />
          <span>{item.label}</span>
        </>
      )}
    </Link>
  );
}
