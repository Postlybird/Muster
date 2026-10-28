import type { Metadata } from "next";

import { SignOutButton } from "@/components/layout/sign-out-button";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin home" };

export default async function AdminHomePage() {
  const user = await requireRole("admin");
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">
        Hello{user.fullName ? `, ${user.fullName}` : ""}
      </h1>
      <p className="text-muted-foreground">
        You&apos;re signed in to the admin area.
      </p>
      <SignOutButton />
    </main>
  );
}
