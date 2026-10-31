"use client";

import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SIGN_UP_CHOICES } from "@/lib/register";
import { cn } from "@/lib/utils";

import { BrandMark } from "./brand-mark";

export type MenuLink = { href: string; label: string };

/**
 * The public site's menu on phones and tablets (owner, 01/11/2026): sign in
 * or register first, then the site's pages. Register opens to the two ways
 * to sign up, so either is two taps from any page.
 */
export function PublicMenu({ links }: { links: MenuLink[] }) {
  const [open, setOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setRegistering(false);
      }}
    >
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 lg:hidden"
          aria-label="Menu"
        >
          <Menu className="size-6" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-sm"
      >
        <div className="flex h-18 items-center border-b px-4">
          <BrandMark size="lg" />
        </div>
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Sign in, register, or go to a page.
        </SheetDescription>
        <div className="space-y-3 p-4">
          <Button asChild size="lg" variant="outline" className="h-12 w-full">
            <Link href="/login" onClick={close}>
              Sign in
            </Link>
          </Button>
          <Button
            size="lg"
            className="h-12 w-full"
            aria-expanded={registering}
            aria-controls="register-choices"
            onClick={() => setRegistering((now) => !now)}
          >
            Register
            <ChevronDown
              className={cn(
                "size-5 transition-transform",
                registering && "rotate-180",
              )}
              aria-hidden
            />
          </Button>
          <ul id="register-choices" hidden={!registering} className="space-y-2">
            {SIGN_UP_CHOICES.map((choice) => (
              <li key={choice.href}>
                <Link
                  href={choice.href}
                  onClick={close}
                  className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:border-primary"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <choice.icon className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold text-deep">
                      {choice.label}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {choice.hint}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <nav aria-label="Site pages" className="border-t p-2">
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-foreground hover:bg-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
