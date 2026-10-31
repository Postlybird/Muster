import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import type { RegisterKind } from "@/lib/register";
import { roleHome } from "@/lib/roles";

import { RegisterForm } from "./register-form";

type Copy = {
  eyebrow: string;
  title: string;
  description: string;
  switchText: string;
  switchLink: { href: string; label: string };
  benefitsTitle: string;
  benefits: { title: string; text: string }[];
};

/** One way to register: the form beside what you get (owner, 01/11/2026). */
export async function RegisterPage({
  kind,
  copy,
}: {
  kind: RegisterKind;
  copy: Copy;
}) {
  const user = await getSessionUser();
  if (user) redirect(roleHome[user.role]);
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-20">
      <div className="mx-auto w-full max-w-md space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-deep sm:text-5xl">
            {copy.title}
          </h1>
          <p className="text-lg text-muted-foreground">{copy.description}</p>
        </div>

        <RegisterForm kind={kind} />

        <div className="space-y-2 border-t pt-6 text-muted-foreground">
          <p>
            {copy.switchText}{" "}
            <Link
              href={copy.switchLink.href}
              className="font-semibold text-primary underline underline-offset-4"
            >
              {copy.switchLink.label}
            </Link>
          </p>
          <p>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline">
            terms
          </Link>{" "}
          and confirm you&apos;ve read our{" "}
          <Link href="/privacy" className="underline">
            privacy policy
          </Link>{" "}
          and{" "}
          <Link href="/privacy#collection-notice" className="underline">
            collection notice
          </Link>
          .
        </p>
      </div>

      <section
        aria-labelledby="register-benefits"
        className="rounded-[2rem] bg-primary-soft p-8 lg:sticky lg:top-[calc(var(--banner-h)+3rem)] xl:p-12"
      >
        <h2
          id="register-benefits"
          className="text-2xl font-bold tracking-tight text-deep sm:text-3xl"
        >
          {copy.benefitsTitle}
        </h2>
        <ul className="mt-6 space-y-5">
          {copy.benefits.map((benefit) => (
            <li key={benefit.title} className="flex gap-3">
              <CircleCheck
                className="mt-0.5 size-6 shrink-0 text-primary"
                aria-hidden
              />
              <p>
                <span className="block font-semibold text-deep">
                  {benefit.title}
                </span>
                <span className="text-muted-foreground">{benefit.text}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
