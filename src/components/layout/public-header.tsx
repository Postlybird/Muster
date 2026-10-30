import Link from "next/link";

import { Button } from "@/components/ui/button";

import { BrandMark } from "./brand-mark";
import { Container } from "./container";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/faq", label: "Questions" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-(--banner-h) z-30 border-b bg-card/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <BrandMark />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent md:block"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/login?as=business">Hire workers</Link>
          </Button>
        </nav>
      </Container>
    </header>
  );
}
