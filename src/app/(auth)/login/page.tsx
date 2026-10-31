import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { HeroVisual } from "@/components/home/hero-visual";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { brand } from "@/config/brand";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { safeNextPath } from "@/lib/redirects";
import { roleHome } from "@/lib/roles";
import { listDemoUsers } from "@/server/demo";

import { DemoSignIn } from "./demo-sign-in";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const copy = {
  worker: {
    eyebrow: "For workers",
    title: "Find work",
    description:
      "Sign in, or create your account with your email. Setting up takes about 5 minutes on your phone.",
  },
  business: {
    eyebrow: "For businesses",
    title: "Hire staff",
    description:
      "Sign in, or create your business account with your work email.",
  },
  default: {
    eyebrow: brand.tagline,
    title: "Sign in",
    description: "Enter your email and we'll send you a code.",
  },
};

/** What a worker sees: a shift offered to them. Example details only. */
function ShiftOffer() {
  return (
    <figure
      aria-labelledby="shift-offer-caption"
      className="mx-auto w-full max-w-md"
    >
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">
            A shift for you
          </p>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Example
          </span>
        </div>
        <p className="mt-4 text-2xl font-bold text-deep">
          Restoration labourer
        </p>
        <p className="mt-1 text-muted-foreground">
          Granville · Tue 7:00 am to 3:30 pm
        </p>
        <p className="mt-4 text-3xl font-extrabold text-deep">
          $33.13
          <span className="text-base font-medium text-muted-foreground">
            {" "}
            an hour, paid weekly
          </span>
        </p>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="What you need">
          <li>
            <Badge variant="neutral">White Card</Badge>
          </li>
          <li>
            <Badge variant="neutral">Steel-cap boots</Badge>
          </li>
        </ul>
        <span
          aria-hidden
          className="mt-5 flex h-12 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground"
        >
          Accept this shift
        </span>
      </div>
      <figcaption
        id="shift-offer-caption"
        className="mt-3 text-center text-xs text-muted-foreground"
      >
        An example of a shift in the worker app.
      </figcaption>
    </figure>
  );
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const as =
    params.as === "worker" || params.as === "business" ? params.as : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;

  const user = await getSessionUser();
  if (user) {
    redirect(safeNextPath(next, roleHome[user.role]));
  }

  const demoUsers = isDemoMode() ? await listDemoUsers() : null;
  const text = copy[as ?? "default"];
  const withNext = (role: "worker" | "business") =>
    `/login?as=${role}${next ? `&next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-20">
      <div className="mx-auto w-full max-w-md space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            {text.eyebrow}
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-deep sm:text-5xl">
            {text.title}
          </h1>
          <p className="text-lg text-muted-foreground">{text.description}</p>
        </div>

        {params.error === "link" ? (
          <Alert variant="destructive">
            <AlertDescription className="text-foreground">
              That sign-in link has expired or was already used. Send yourself a
              new code.
            </AlertDescription>
          </Alert>
        ) : null}

        <LoginForm as={as} next={next} />

        <p className="border-t pt-6 text-muted-foreground">
          {as === "worker" ? (
            <>
              Hiring staff instead?{" "}
              <Link
                href={withNext("business")}
                className="font-semibold text-primary underline underline-offset-4"
              >
                Sign in as a business
              </Link>
            </>
          ) : as === "business" ? (
            <>
              Looking for work?{" "}
              <Link
                href={withNext("worker")}
                className="font-semibold text-primary underline underline-offset-4"
              >
                Sign in as a worker
              </Link>
            </>
          ) : (
            <>
              New to {brand.name}?{" "}
              <Link
                href={withNext("worker")}
                className="font-semibold text-primary underline underline-offset-4"
              >
                Find work
              </Link>{" "}
              or{" "}
              <Link
                href={withNext("business")}
                className="font-semibold text-primary underline underline-offset-4"
              >
                hire staff
              </Link>
              .
            </>
          )}
        </p>

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

        {demoUsers ? <DemoSignIn users={demoUsers} /> : null}
      </div>

      {/* Stays beside the form, even when demo accounts make it long. */}
      <div className="hidden rounded-[2rem] bg-primary-soft p-10 lg:sticky lg:top-[calc(var(--banner-h)+3rem)] lg:block xl:p-14">
        {as === "worker" ? <ShiftOffer /> : <HeroVisual />}
      </div>
    </div>
  );
}
