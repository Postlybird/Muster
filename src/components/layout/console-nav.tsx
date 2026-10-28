"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  adminNav,
  businessNav,
  businessPostWork,
  type NavGroup,
} from "@/config/navigation";
import type { SessionUser } from "@/lib/auth";

import { NavLink } from "./nav-link";
import { SignOutButton } from "./sign-out-button";
import { UserSummary } from "./user-summary";

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
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
                  className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground hover:bg-muted"
                  activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function ConsoleMobileNav({
  area,
  user,
  areaLabel,
}: {
  area: "business" | "admin";
  user: SessionUser;
  areaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="size-6" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{areaLabel} menu</SheetTitle>
          <SheetDescription className="sr-only">
            Pages in the {areaLabel} area
          </SheetDescription>
        </SheetHeader>
        <div className="px-3">
          <ConsoleNav area={area} onNavigate={() => setOpen(false)} />
        </div>
        <div className="mt-auto space-y-2 border-t p-4">
          <UserSummary user={user} />
          <SignOutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
