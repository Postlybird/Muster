import { ExternalLink, UserRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { roleLabel, type UserRole } from "@/lib/roles";
import type { DemoUser } from "@/server/demo";

import { demoSignIn } from "./actions";

const ROLE_ORDER: UserRole[] = ["admin", "business_user", "worker"];

/** Demo mode only: one-tap sign-in as any seeded demo account. */
export function DemoSignIn({ users }: { users: DemoUser[] }) {
  return (
    <section
      aria-labelledby="demo-sign-in"
      className="space-y-4 rounded-xl border border-dashed border-warning/60 bg-warning-soft p-4"
    >
      <div className="space-y-1">
        <h2 id="demo-sign-in" className="font-semibold">
          Demo: sign in as
        </h2>
        <p className="text-sm text-muted-foreground">
          Demo mode doesn&apos;t send real texts or emails. Codes appear in the{" "}
          <Link
            href="/dev/outbox"
            target="_blank"
            className="font-medium text-foreground underline"
          >
            demo outbox
            <ExternalLink
              className="ml-0.5 inline size-3"
              aria-label="(opens in a new tab)"
            />
          </Link>
          , or pick a demo account below.
        </p>
      </div>

      {users.length === 0 ? (
        <p className="text-sm">
          No demo accounts yet. Run{" "}
          <code className="font-mono">npm run seed</code> to add them.
        </p>
      ) : (
        ROLE_ORDER.map((role) => {
          const group = users.filter((u) => u.role === role);
          if (group.length === 0) return null;
          return (
            <details
              key={role}
              open={role !== "worker"}
              className="group space-y-2"
            >
              <summary className="cursor-pointer text-sm font-medium">
                {roleLabel[role]} accounts ({group.length})
              </summary>
              <ul className="grid gap-2">
                {group.map((user) => (
                  <li key={user.id}>
                    <form action={demoSignIn.bind(null, user.id)}>
                      <Button
                        type="submit"
                        variant="outline"
                        className="h-auto w-full justify-start py-2 text-left"
                      >
                        <UserRound aria-hidden />
                        <span className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {user.email}
                          </span>
                        </span>
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </details>
          );
        })
      )}
    </section>
  );
}
