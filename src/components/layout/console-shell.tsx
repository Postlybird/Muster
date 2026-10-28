import type { SessionUser } from "@/lib/auth";

import { BrandMark } from "./brand-mark";
import { ConsoleMobileNav, ConsoleNav } from "./console-nav";
import { SignOutButton } from "./sign-out-button";
import { UserSummary } from "./user-summary";

export type ConsoleArea = "business" | "admin";

/**
 * Desktop-comfortable layout for business users and admins: sidebar on
 * wide screens, a slide-out menu on phones.
 */
export function ConsoleShell({
  area,
  user,
  areaLabel,
  children,
}: {
  area: ConsoleArea;
  user: SessionUser;
  areaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="sticky top-(--banner-h) hidden h-[calc(100dvh-var(--banner-h))] w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <BrandMark href={`/${area}`} />
          <span className="text-sm text-muted-foreground">{areaLabel}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <ConsoleNav area={area} />
        </div>
        <div className="space-y-2 border-t p-4">
          <UserSummary user={user} />
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-(--banner-h) z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur lg:hidden">
          <ConsoleMobileNav area={area} user={user} areaLabel={areaLabel} />
          <BrandMark href={`/${area}`} />
          <span className="text-sm text-muted-foreground">{areaLabel}</span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
