import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { brand } from "@/config/brand";
import { getSessionUser } from "@/lib/auth";
import { SIGN_UP_CHOICES } from "@/lib/register";
import { roleHome } from "@/lib/roles";

export const metadata: Metadata = { title: "Register" };

const DETAILS: Record<string, string> = {
  "/register/business":
    "Post shifts in about a minute and book checked staff, general or skilled.",
  "/register/worker":
    "Pick up shifts near you that fit your week, and get paid every week.",
};

/** Register: business or worker, then a short form (owner, 01/11/2026). */
export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect(roleHome[user.role]);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-deep sm:text-5xl">
          Create your free account
        </h1>
        <p className="text-lg text-muted-foreground">
          How will you use {brand.name}? It takes a minute or two.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {SIGN_UP_CHOICES.map((choice) => (
          <li key={choice.href}>
            <Link
              href={choice.href}
              className="group flex h-full flex-col gap-4 rounded-3xl border bg-card p-6 shadow-soft transition-colors hover:border-primary"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <choice.icon className="size-6" aria-hidden />
              </span>
              <span className="space-y-1">
                <span className="block text-sm font-semibold tracking-wide text-primary uppercase">
                  {choice.hint}
                </span>
                <span className="flex items-center gap-2 text-xl font-bold text-deep">
                  {choice.label}
                  <ArrowRight
                    className="size-5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
                <span className="block text-muted-foreground">
                  {DETAILS[choice.href]}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-center text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
