import Link from "next/link";

import { BrandMark } from "@/components/layout/brand-mark";

/**
 * Sign-in pages: the website's logo along the top, and the page below.
 * Each page lays itself out (the sign-in page puts an example beside its
 * form on wide screens).
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-18 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-20">
          <BrandMark size="lg" />
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to the website
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-16">
        {children}
      </main>
    </div>
  );
}
