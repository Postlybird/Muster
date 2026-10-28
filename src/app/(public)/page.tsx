import Link from "next/link";

import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="space-y-4">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
          {brand.launchCity} · Restoration and cleaning
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {brand.name}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          {brand.tagline}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/login?as=worker">Find work</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login?as=business">Hire workers</Link>
        </Button>
      </div>
    </main>
  );
}
