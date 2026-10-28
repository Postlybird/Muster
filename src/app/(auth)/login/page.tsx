import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    title: "Find work",
    description:
      "Sign in, or create your worker account. It takes about 5 minutes to get set up.",
  },
  business: {
    title: "Hire workers",
    description: "Sign in, or create an account for your business.",
  },
  default: {
    title: "Sign in",
    description: "Use the mobile number or email address you signed up with.",
  },
};

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-bold">{text.title}</h1>
          </CardTitle>
          <CardDescription>{text.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error === "link" ? (
            <Alert variant="destructive">
              <AlertDescription className="text-foreground">
                That sign-in link has expired or was already used. Send yourself
                a new code.
              </AlertDescription>
            </Alert>
          ) : null}
          <LoginForm
            as={as}
            next={next}
            defaultMethod={as === "business" ? "email" : "phone"}
          />
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
        </CardContent>
      </Card>

      {demoUsers ? <DemoSignIn users={demoUsers} /> : null}
    </div>
  );
}
