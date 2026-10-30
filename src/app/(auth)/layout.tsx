import { Check } from "lucide-react";

import { BrandMark } from "@/components/layout/brand-mark";
import { brand } from "@/config/brand";

const POINTS = [
  "Checked, job-ready staff for every industry",
  "Shifts posted in about a minute, picked up on a phone",
  "No passwords: we text or email you a code",
];

/**
 * Sign-in pages: the form, and on wider screens a full-height brand panel
 * beside it.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      <aside className="sticky top-(--banner-h) hidden h-[calc(100dvh-var(--banner-h))] w-[44%] max-w-2xl flex-col justify-between bg-deep p-12 text-deep-foreground lg:flex xl:p-16">
        <BrandMark tone="light" />
        <div className="space-y-8">
          <p className="text-5xl leading-[1.05] font-extrabold tracking-tight text-balance xl:text-6xl">
            {brand.tagline}
          </p>
          <ul className="space-y-3 text-lg">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Check
                  className="mt-1 size-5 shrink-0 text-highlight"
                  aria-hidden
                />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-deep-foreground/80">
          On-demand staff for every industry · Australia-wide
        </p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="mx-auto flex w-full max-w-md items-center px-4 pt-6 lg:hidden">
          <BrandMark />
        </header>
        <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 lg:py-16">
          {children}
        </main>
      </div>
    </div>
  );
}
