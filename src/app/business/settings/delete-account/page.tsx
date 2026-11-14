import type { Metadata } from "next";
import Link from "next/link";

import { DeleteAccountButton } from "@/components/account/delete-account-button";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import { demoAccountKept } from "@/server/accounts";
import { businessName, getMyBusiness } from "@/server/businesses";

import { deleteMyAccount } from "./actions";

export const metadata: Metadata = { title: "Delete my account" };

/**
 * Delete my account (owner, 14/11/2026; both app stores require it). The
 * last owner's account closing closes the business too, as
 * `close_my_account()` does, so its upcoming shifts are cancelled first.
 */
export default async function DeleteBusinessAccountPage() {
  const { business, role, user } = await getMyBusiness();
  const supabase = await createClient();

  let lastOwner = false;
  let upcoming = 0;
  if (business && role === "owner") {
    const { count: otherOwners } = await supabase
      .from("business_users")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("role", "owner")
      .neq("profile_id", user.id)
      .is("archived_at", null);
    lastOwner = !otherOwners;
  }
  if (business && lastOwner) {
    const { count } = await supabase
      .from("shifts")
      .select("id, jobs!inner(business_id, status)", {
        count: "exact",
        head: true,
      })
      .eq("jobs.business_id", business.id)
      .eq("jobs.status", "posted")
      .in("status", ["open", "filled"])
      .gt("ends_at", new Date().toISOString());
    upcoming = count ?? 0;
  }
  const name = business ? businessName(business) : null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Delete my account" />

      <section aria-labelledby="what-happens" className="space-y-3">
        <h2 id="what-happens" className="text-lg font-semibold">
          What happens
        </h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>You&apos;re signed out for good, and we stop messaging you.</li>
          {name && lastOwner ? (
            <>
              <li>
                {name} closes too, for everyone on your team, as you&apos;re its
                only owner.
              </li>
              <li>Any invoices still due must still be paid.</li>
            </>
          ) : name ? (
            <li>{name} carries on without you.</li>
          ) : null}
          <li>
            We keep the records the law requires, like jobs, hours and invoices,
            for 7 years. Only our team can see them.
          </li>
          <li>To book workers with us again later, contact us.</li>
        </ul>
      </section>

      {upcoming ? (
        <Alert variant="warning">
          <AlertDescription className="text-foreground">
            {name} has {upcoming === 1 ? "a shift" : `${upcoming} shifts`}{" "}
            coming up. Cancel {upcoming === 1 ? "it" : "them"} first on{" "}
            <Link
              href="/business/jobs"
              className="underline underline-offset-4"
            >
              Jobs
            </Link>
            , then come back here.
          </AlertDescription>
        </Alert>
      ) : demoAccountKept(user.email) ? (
        <Alert>
          <AlertDescription>
            Demo accounts can&apos;t be deleted. Sign up with your own email to
            try it.
          </AlertDescription>
        </Alert>
      ) : (
        <DeleteAccountButton
          action={deleteMyAccount}
          description={
            name && lastOwner
              ? `You'll be signed out for good, and ${name} closes for your whole team. This can't be undone.`
              : "You'll be signed out for good, and this can't be undone."
          }
        />
      )}

      <p className="text-sm">
        <Link
          href="/business/settings"
          className="underline underline-offset-4"
        >
          Back to settings
        </Link>
      </p>
    </div>
  );
}
