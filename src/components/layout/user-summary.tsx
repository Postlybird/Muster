import { UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { SessionUser } from "@/lib/auth";
import { formatAuPhone } from "@/lib/phone";
import { roleLabel } from "@/lib/roles";

export function initials(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

export function UserSummary({ user }: { user: SessionUser }) {
  const contact = user.email ?? formatAuPhone(user.phone);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar>
        <AvatarFallback>
          {user.fullName ? (
            initials(user.fullName)
          ) : (
            <UserRound className="size-5" aria-hidden />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 text-sm">
        <p className="truncate font-medium">
          {user.fullName ?? roleLabel[user.role]}
        </p>
        <p className="truncate text-muted-foreground">{contact}</p>
      </div>
    </div>
  );
}
