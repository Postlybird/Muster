import Link from "next/link";

import { brand } from "@/config/brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-muted/40">
      <header className="mx-auto flex w-full max-w-md items-center px-4 pt-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-primary"
        >
          {brand.name}
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
