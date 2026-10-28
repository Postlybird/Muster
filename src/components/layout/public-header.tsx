import Link from "next/link";

import { Button } from "@/components/ui/button";

import { BrandMark } from "./brand-mark";

export function PublicHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <BrandMark />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/login?as=worker"
            className="hidden rounded-md px-3 py-2 text-sm font-medium hover:bg-accent sm:block"
          >
            Find work
          </Link>
          <Link
            href="/login?as=business"
            className="hidden rounded-md px-3 py-2 text-sm font-medium hover:bg-accent sm:block"
          >
            Hire workers
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
