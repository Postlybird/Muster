"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { workerMenu } from "@/config/navigation";
import type { SessionUser } from "@/lib/auth";

import { NavLink } from "./nav-link";
import { SignOutButton } from "./sign-out-button";
import { UserSummary } from "./user-summary";

export function WorkerMenu({
  user,
  unread = 0,
}: {
  user: SessionUser;
  /** Notifications not yet seen, shown on the menu and its item. */
  unread?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unread > 0
              ? `Open menu, ${unread} new notification${unread === 1 ? "" : "s"}`
              : "Open menu"
          }
          className="relative"
        >
          <Menu className="size-6" aria-hidden />
          {unread > 0 ? (
            <span
              className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-destructive"
              aria-hidden
            />
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Your account and other pages
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <UserSummary user={user} />
        </div>
        <Separator />
        <nav aria-label="More">
          <ul className="space-y-1 px-2">
            {workerMenu.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  onNavigate={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-md px-3 text-base hover:bg-muted"
                  activeClassName="bg-accent font-medium text-accent-foreground"
                >
                  <item.icon className="size-5 shrink-0" aria-hidden />
                  <span>{item.label}</span>
                  {item.href === "/worker/notifications" && unread > 0 ? (
                    <span className="ml-auto rounded-full bg-destructive px-2 text-sm font-medium text-white">
                      {unread}
                      <span className="sr-only"> new</span>
                    </span>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Separator />
        <SignOutButton className="px-2" />
      </SheetContent>
    </Sheet>
  );
}
