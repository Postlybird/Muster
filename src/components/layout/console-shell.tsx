import type { SessionUser } from "@/lib/auth";

import { BrandMark } from "./brand-mark";
import { ConsoleNav, ConsoleStripNav } from "./console-nav";
import { SignOutButton } from "./sign-out-button";
import { UserSummary } from "./user-summary";

export type ConsoleArea = "business" | "admin";

/**
 * Layout for business users and admins, with every page always in view:
 * a sidebar on tablets and computers, a row of pages under the header on
 * phones. The page itself uses the full width of the screen.
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
      <aside className="sticky top-(--banner-h) hidden h-[calc(100dvh-var(--banner-h))] w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
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
        <header className="sticky top-(--banner-h) z-30 border-b bg-card/95 backdrop-blur md:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <BrandMark href={`/${area}`} />
            <span className="text-sm text-muted-foreground">{areaLabel}</span>
          </div>
          <ConsoleStripNav area={area} />
        </header>
        <main className="w-full flex-1 px-4 py-6 md:px-8 md:py-8 xl:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
