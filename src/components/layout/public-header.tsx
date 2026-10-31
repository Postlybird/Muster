import Link from "next/link";

import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";

import { BrandMark } from "./brand-mark";
import { Container } from "./container";
import { PublicMenu } from "./public-menu";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#why-shifta", label: `Why ${brand.name}` },
  { href: "/industries", label: "Industries" },
  { href: "/faq", label: "Questions" },
  { href: "/contact", label: "Contact" },
];

/**
 * The public site's header. On computers the pages are across the top; on
 * phones and tablets they're in the menu, with signing in and registering
 * (owner, 01/11/2026).
 */
export function PublicHeader() {
  return (
    <header className="sticky top-(--banner-h) z-30 border-b bg-card/95 backdrop-blur">
      <Container className="flex h-18 items-center justify-between gap-4 sm:h-20">
        <BrandMark size="lg" />
        <div className="flex items-center gap-1 sm:gap-2">
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/register">Register</Link>
          </Button>
          <PublicMenu links={links} />
        </div>
      </Container>
    </header>
  );
}
