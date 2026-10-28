import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { brand } from "@/config/brand";

import { confirmSignIn } from "./actions";
import { isEmailOtpType } from "./otp-types";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

/**
 * Sign-in links in emails land here. Opening the link does nothing by
 * itself; the person presses "Sign in". Email security scanners and link
 * previews open links automatically, and would otherwise use up the
 * one-time sign-in link before the person gets to it.
 */
export default async function ConfirmPage({
  searchParams,
}: PageProps<"/auth/confirm">) {
  const params = await searchParams;
  const tokenHash =
    typeof params.token_hash === "string" ? params.token_hash : "";
  const type = typeof params.type === "string" ? params.type : "";
  const next = typeof params.next === "string" ? params.next : "";
  const valid = tokenHash !== "" && isEmailOtpType(type);

  return (
    <div className="flex flex-1 flex-col bg-muted/40">
      <header className="mx-auto flex w-full max-w-md items-center px-4 pt-6">
        <BrandMark />
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="text-2xl font-bold">
                {valid ? `Sign in to ${brand.name}` : "This link doesn't work"}
              </h1>
            </CardTitle>
            <CardDescription>
              {valid
                ? "Press the button to finish signing in."
                : "It may be incomplete or out of date. Send yourself a new code instead."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {valid ? (
              <form action={confirmSignIn}>
                <input type="hidden" name="token_hash" value={tokenHash} />
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="next" value={next} />
                <Button type="submit" size="lg" className="w-full">
                  Sign in
                </Button>
              </form>
            ) : (
              <Button asChild size="lg" className="w-full">
                <Link href="/login">Get a new code</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
