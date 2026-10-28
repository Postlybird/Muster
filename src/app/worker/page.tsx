import type { Metadata } from "next";

import { SignOutButton } from "@/components/layout/sign-out-button";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Worker home" };

export default async function WorkerHomePage() {
  const user = await requireRole("worker");
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">
        Hello{user.fullName ? `, ${user.fullName}` : ""}
      </h1>
      <p className="text-muted-foreground">
        You&apos;re signed in to the worker area.
      </p>
      <SignOutButton />
    </main>
  );
}
