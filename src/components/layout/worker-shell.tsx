import type { SessionUser } from "@/lib/auth";

import { BrandMark } from "./brand-mark";
import { WorkerMenu } from "./worker-menu";
import { WorkerTabBar } from "./worker-tab-bar";

/**
 * Worker app layout: mobile-first, big tap targets, the four main tabs at
 * the bottom of the screen (thumb reach) and everything else in the menu.
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
    <div className="flex flex-1 flex-col">
      <header className="sticky top-(--banner-h) z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <BrandMark href="/worker" />
          <WorkerMenu user={user} unread={unread} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-28">
        {children}
      </main>
      <WorkerTabBar />
    </div>
  );
}
