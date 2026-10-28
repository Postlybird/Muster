import type { Metadata } from "next";

import { SignOutButton } from "@/components/layout/sign-out-button";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Business home" };

export default async function BusinessHomePage() {
  const user = await requireRole("business_user");
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">
        Hello{user.fullName ? `, ${user.fullName}` : ""}
      </h1>
      <p className="text-muted-foreground">
        You&apos;re signed in to the business area.
      </p>
      <SignOutButton />
    </main>
  );
}
