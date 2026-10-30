import type { SessionUser } from "@/lib/auth";

import { BrandMark } from "./brand-mark";
import { SignOutButton } from "./sign-out-button";
import { UserSummary } from "./user-summary";
import { WorkerMoreNav, WorkerSideNav, WorkerTabBar } from "./worker-nav";

/**
 * Worker app layout, mobile-first with every page always in view: on
 * phones, the main tabs along the bottom (thumb reach) and the rest in a
 * row under the header; on tablets and computers, a sidebar.
 */
export function WorkerShell({
  user,
  unread = 0,
  children,
}: {
  user: SessionUser;
  /** Notifications not yet seen. */
  unread?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="sticky top-(--banner-h) hidden h-[calc(100dvh-var(--banner-h))] w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-16 items-center px-5">
          <BrandMark href="/worker" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <WorkerSideNav unread={unread} />
        </div>
        <div className="space-y-2 border-t p-4">
          <UserSummary user={user} />
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-(--banner-h) z-30 border-b bg-card/95 backdrop-blur md:hidden">
          <div className="flex h-14 items-center px-4">
            <BrandMark href="/worker" />
          </div>
          <WorkerMoreNav unread={unread} />
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-28 md:px-8 md:pt-8 md:pb-12">
          {children}
        </main>
        <WorkerTabBar className="md:hidden" />
      </div>
    </div>
  );
}
