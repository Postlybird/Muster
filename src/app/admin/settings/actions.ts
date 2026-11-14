"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { makeVapidKeys } from "@/adapters/push/web-push";
import {
  SETTINGS,
  settingKeys,
  type SettingGroup,
  type SettingKey,
} from "@/config/settings";
import { requireAdmin } from "@/lib/auth";
import { failure, formBoolean, success, type ActionState } from "@/lib/forms";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { prepareReviewAccount, reviewAccount } from "@/server/app-review";

/** Reads one setting's value out of the form, shaped for its schema. */
function readValue(key: SettingKey, formData: FormData): unknown {
  const input = SETTINGS[key].input;
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const number = (name: string) =>
    text(name) === "" ? undefined : Number(text(name));

  switch (input.kind) {
    case "number":
      return number(key);
    case "boolean":
      return formBoolean(formData.get(key));
    case "weekday":
      return text(key);
    case "time_range":
      return { start: text(`${key}.start`), end: text(`${key}.end`) };
    case "number_list":
      return text(key)
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
    case "percent_fields":
      return Object.fromEntries(
        input.fields.map((f) => [f.key, number(`${key}.${f.key}`)]),
      );
    case "text":
      return text(key);
    case "text_fields":
      return Object.fromEntries(
        input.fields.map((f) => [f.key, text(`${key}.${f.key}`)]),
      );
  }
}

function friendlyError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Check this value.";
  if (issue.code === "invalid_type") return "Enter a value.";
  if (issue.code === "too_small") return `Must be at least ${issue.minimum}.`;
  if (issue.code === "too_big") return `Must be at most ${issue.maximum}.`;
  return issue.message;
}

export async function saveSettingsGroup(
  group: SettingGroup,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const keys = settingKeys.filter((key) => SETTINGS[key].group === group);

  const fieldErrors: Record<string, string[]> = {};
  const rows: {
    key: string;
    value: NonNullable<Json>;
    is_public: boolean;
    description: string;
    updated_by: string;
  }[] = [];

  for (const key of keys) {
    const definition = SETTINGS[key];
    const parsed = definition.schema.safeParse(readValue(key, formData));
    if (!parsed.success) {
      fieldErrors[key] = [friendlyError(parsed.error)];
      continue;
    }
    rows.push({
      key,
      value: parsed.data as NonNullable<Json>,
      is_public: definition.isPublic,
      description: definition.help,
      updated_by: user.id,
    });
  }

  const reviewOn = rows.some(
    (row) => row.key === "app_review_sign_in" && row.value === true,
  );
  if (reviewOn && !reviewAccount()) {
    fieldErrors.app_review_sign_in = [
      "The reviewers' account needs APP_REVIEW_EMAIL and a 6-digit APP_REVIEW_CODE in the hosting settings first.",
    ];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return failure("Some values need fixing. Nothing was saved.", fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert(rows, { onConflict: "key" });
  if (error) return failure(`Couldn't save: ${error.message}`);

  // Switching review sign-in on gets the reviewers' account ready.
  if (reviewOn) {
    const ready = await prepareReviewAccount();
    if (!ready.ok) {
      await supabase
        .from("settings")
        .update({ value: false })
        .eq("key", "app_review_sign_in");
      revalidatePath("/admin/settings");
      return failure(`${ready.error} Review sign-in is still off.`);
    }
  }

  revalidatePath("/admin/settings");
  return success(
    reviewOn
      ? "Settings saved. The reviewers' account is ready to sign in."
      : "Settings saved",
  );
}

/**
 * A new pair of keys for real push notifications. Shown to the admin once
 * and never saved: the owner adds them to the hosting settings.
 */
export async function makePushKeys(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  await requireAdmin();
  return makeVapidKeys();
}
