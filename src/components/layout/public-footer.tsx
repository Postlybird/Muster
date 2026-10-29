import Link from "next/link";

import { brand } from "@/config/brand";

import { BrandMark } from "./brand-mark";

const columns = [
  {
    title: "Businesses",
    links: [
      { href: "/login?as=business", label: "Hire workers" },
      { href: "/#hire-workers", label: "How it works for businesses" },
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
    <footer className="border-t bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 text-sm md:grid-cols-[1.2fr_2fr]">
        <div className="space-y-3">
          <BrandMark />
          <p className="max-w-xs text-muted-foreground">
            Labour hire for restoration and cleaning, {brand.launchCity}.
          </p>
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} {brand.name}
          </p>
        </div>
        <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title} className="space-y-3">
              <h2 className="font-semibold text-foreground">{column.title}</h2>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}
