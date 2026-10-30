import Link from "next/link";

import { brand } from "@/config/brand";

import { BrandMark } from "./brand-mark";
import { Container } from "./container";

const columns = [
  {
    title: "Businesses",
    links: [
      { href: "/login?as=business", label: "Hire staff" },
      { href: "/#hire-staff", label: "How it works for businesses" },
    ],
  },
  {
    title: "Workers",
    links: [
      { href: "/login?as=worker", label: "Find work" },
      { href: "/#find-work", label: "How it works for workers" },
    ],
  },
  {
    title: brand.name,
    links: [
      { href: "/faq", label: "Questions" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="bg-deep text-deep-foreground">
      <Container className="grid gap-10 py-14 text-sm md:grid-cols-[1.2fr_2fr]">
        <div className="space-y-3">
          <BrandMark tone="light" />
          <p className="text-xl font-extrabold tracking-tight">
            {brand.tagline}
          </p>
          <p className="max-w-xs text-deep-foreground/80">
            On-demand staff for every industry. Now in {brand.launchCity}.
          </p>
          <p className="text-deep-foreground/80">
            © {new Date().getFullYear()} {brand.name}
          </p>
        </div>
        <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title} className="space-y-3">
              <h2 className="font-semibold">{column.title}</h2>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-deep-foreground/80 underline-offset-4 hover:text-deep-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
