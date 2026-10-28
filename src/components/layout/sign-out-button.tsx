import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Works without JavaScript: a plain form post to the sign-out route. */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action="/auth/sign-out" method="post" className={className}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut aria-hidden />
        Sign out
      </Button>
    </form>
  );
}
