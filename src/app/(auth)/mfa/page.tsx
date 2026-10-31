import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/layout/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminNeedsSecondFactor, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { SetupAuthenticator, VerifyAuthenticator } from "./mfa-form";

export const metadata: Metadata = { title: "Authenticator app" };

/** Admins confirm a code from their authenticator app after signing in. */
export default async function MfaPage() {
  const user = await requireRole("admin");
  if (!adminNeedsSecondFactor(user)) redirect("/admin");

  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp?.[0];

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">
            {factor ? "Enter your code" : "Set up your authenticator app"}
          </h1>
        </CardTitle>
        <CardDescription>
          {factor
            ? "Admin accounts need a code from your authenticator app as well as your email sign-in."
            : "Admin accounts are protected by an authenticator app on your phone, as well as your email sign-in. It takes a minute to set up."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {factor ? (
          <VerifyAuthenticator factorId={factor.id} />
        ) : (
          <SetupAuthenticator />
        )}
        <div className="border-t pt-4 text-sm text-muted-foreground">
          <p>
            Lost your phone? Ask another admin to reset your authenticator app.
          </p>
          <SignOutButton className="-ml-3 pt-2" />
        </div>
      </CardContent>
    </Card>
  );
}
