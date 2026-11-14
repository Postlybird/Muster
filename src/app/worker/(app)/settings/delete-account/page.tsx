import type { Metadata } from "next";
import Link from "next/link";

import { DeleteAccountButton } from "@/components/account/delete-account-button";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { demoAccountKept } from "@/server/accounts";

import { deleteMyAccount } from "./actions";

export const metadata: Metadata = { title: "Delete my account" };

/**
 * Delete my account (owner, 14/11/2026; both app stores require it). What
 * goes and what's kept follows `close_my_account()`.
 */
export default async function DeleteWorkerAccountPage() {
  const user = await requireRole("worker");
  const supabase = await createClient();
  // Workers read their bookings through my_shifts(), not the tables.
  const { data: shifts } = await supabase.rpc("my_shifts");
  const booked = stillBooked(shifts ?? []);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Delete my account" />

      <section aria-labelledby="what-happens" className="space-y-3">
        <h2 id="what-happens" className="text-lg font-semibold">
          What happens
        </h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>You&apos;re signed out for good, and we stop messaging you.</li>
          <li>
            We delete your photo, your &ldquo;about me&rdquo;, your availability
            and your phones&apos; notifications.
          </li>
          <li>Shifts you&apos;ve applied for are withdrawn.</li>
          <li>You&apos;re still paid for any hours you&apos;ve worked.</li>
          <li>
            We keep the records the law requires, like your shifts, hours and
            pay, for 7 years. Only our team can see them.
          </li>
          <li>To work with us again later, contact us.</li>
        </ul>
      </section>

      {booked ? (
        <Alert variant="warning">
          <AlertDescription className="text-foreground">
            You have {booked === 1 ? "a shift" : `${booked} shifts`} booked.
            Cancel {booked === 1 ? "it" : "them"} first on{" "}
            <Link
              href="/worker/my-shifts"
              className="underline underline-offset-4"
            >
              My shifts
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
          description="You'll be signed out for good, and this can't be undone."
        />
      )}

      <p className="text-sm">
        <Link href="/worker/settings" className="underline underline-offset-4">
          Back to settings
        </Link>
      </p>
    </div>
  );
}

/** Bookings that haven't finished yet. */
function stillBooked(
  shifts: { assignment_status: string | null; ends_at: string }[],
): number {
  const now = Date.now();
  return shifts.filter(
    (shift) =>
      shift.assignment_status === "confirmed" &&
      new Date(shift.ends_at).getTime() > now,
  ).length;
}
