import type { Metadata } from "next";

import { pushPublicKey } from "@/adapters/push";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  parseSetting,
  SETTINGS,
  settingGroups,
  settingKeys,
  type SettingGroup,
} from "@/config/settings";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { makePushKeys } from "./actions";
import { PushKeys } from "./push-keys";
import { SettingsGroupForm, type SettingRow } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value, updated_by");
  const stored = new Map((data ?? []).map((row) => [row.key, row]));

  const rowsFor = (group: SettingGroup): SettingRow[] =>
    settingKeys
      .filter((key) => SETTINGS[key].group === group)
      .map((key) => {
        const definition = SETTINGS[key];
        const row = stored.get(key);
        return {
          key,
          label: definition.label,
          help: definition.help,
          input: definition.input,
          value: parseSetting(key, row?.value).value,
          unconfirmed: !!definition.placeholder && !row?.updated_by,
          isPublic: definition.isPublic,
        };
      });

  const unconfirmedCount = (Object.keys(settingGroups) as SettingGroup[])
    .flatMap(rowsFor)
    .filter((row) => row.unconfirmed).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Policies used across the app. Changes are recorded in the audit log."
      />
      {unconfirmedCount > 0 ? (
        <Alert variant="warning">
          <AlertTitle>
            {unconfirmedCount} placeholder values to confirm before launch
          </AlertTitle>
          <AlertDescription>
            These were guesses for the demo. Check each one marked Placeholder
            (money settings with a payroll professional), then save its section.
          </AlertDescription>
        </Alert>
      ) : null}
      {(Object.entries(settingGroups) as [SettingGroup, string][]).map(
        ([group, title]) => (
          <SettingsGroupForm
            key={group}
            group={group}
            title={title}
            rows={rowsFor(group)}
          />
        ),
      )}
      <section
        aria-labelledby="push"
        className="space-y-3 rounded-lg border bg-card p-4"
      >
        <h2 id="push" className="text-lg font-semibold">
          Push notifications
        </h2>
        {pushPublicKey() ? (
          <p className="text-sm">
            Set up. Workers who install the app and turn notifications on get
            messages there instead of by text.
          </p>
        ) : (
          <>
            <p className="text-sm">
              Not set up yet, so workers get texts (in the demo, messages that
              would be pushed go to the outbox). Push notifications are free;
              they need a pair of keys added to the hosting settings.
            </p>
            <PushKeys makeKeys={makePushKeys} />
          </>
        )}
      </section>
    </div>
  );
}
