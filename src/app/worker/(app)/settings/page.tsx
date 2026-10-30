import type { Metadata } from "next";
import Link from "next/link";

import { pushPublicKey } from "@/adapters/push";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { PreferencesForm } from "@/components/notifications/preferences-form";
import { PushToggle } from "@/components/notifications/push-toggle";
import { PageHeader } from "@/components/page-header";
import {
  CATEGORIES_FOR,
  NOTIFICATION_CATEGORIES,
} from "@/config/notifications";
import { readPrefs } from "@/domain/notifications";
import { requireRole } from "@/lib/auth";
import { formatAuPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { choosableCategories } from "@/server/notification-settings";

import {
  savePreferences,
  turnOffPush,
  turnOnDemoPush,
  turnOnPush,
} from "./actions";

export const metadata: Metadata = { title: "Settings" };

/** How we reach the worker, and what about (brief §5). */
export default async function WorkerSettingsPage() {
  const user = await requireRole("worker");
  const supabase = await createClient();
  const [{ data: profile }, { data: worker }] = await Promise.all([
    supabase
      .from("profiles")
      .select("notification_prefs, email, phone")
      .eq("id", user.id)
      .single(),
    supabase
      .from("workers")
      .select("urgent_opt_in")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);
  const prefs = readPrefs(profile?.notification_prefs);
  const choices = choosableCategories("worker").map((key) => ({
    key,
    label: NOTIFICATION_CATEGORIES[key].label,
    help: NOTIFICATION_CATEGORIES[key].help,
    on: prefs[key] !== false,
  }));
  const alwaysSent = CATEGORIES_FOR.worker
    .filter((key) => NOTIFICATION_CATEGORIES[key].critical)
    .map((key) => NOTIFICATION_CATEGORIES[key].label.toLowerCase());

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="How we contact you." />

      <section aria-labelledby="device" className="space-y-3">
        <h2 id="device" className="text-lg font-semibold">
          Notifications on this phone
        </h2>
        <PushToggle
          publicKey={pushPublicKey()}
          turnOn={turnOnPush}
          turnOnDemo={turnOnDemoPush}
          turnOff={turnOffPush}
        />
      </section>

      <section aria-labelledby="what" className="space-y-3">
        <h2 id="what" className="text-lg font-semibold">
          What we send you
        </h2>
        <PreferencesForm
          action={savePreferences}
          choices={choices}
          alwaysSent={alwaysSent}
        />
        <p className="text-sm">
          Urgent call-outs are {worker?.urgent_opt_in ? "on" : "off"}. Change
          that on{" "}
          <Link
            href="/worker/availability"
            className="underline underline-offset-4"
          >
            Availability
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="where" className="space-y-3">
        <h2 id="where" className="text-lg font-semibold">
          Where we reach you
        </h2>
        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2 text-sm">
          <dt className="text-muted-foreground">Mobile</dt>
          <dd>{profile?.phone ? formatAuPhone(profile.phone) : "—"}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="[overflow-wrap:anywhere]">{profile?.email ?? "—"}</dd>
        </dl>
        <p className="text-sm">
          <Link
            href="/worker/onboarding/contact"
            className="underline underline-offset-4"
          >
            Change your contact details
          </Link>
        </p>
      </section>

      <section aria-labelledby="account" className="space-y-3">
        <h2 id="account" className="text-lg font-semibold">
          Your account
        </h2>
        <SignOutButton />
      </section>
    </div>
  );
}
