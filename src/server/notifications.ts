import "server-only";

import { cache } from "react";

import { getEmailSender, type EmailAttachment } from "@/adapters/email";
import { getPushSender } from "@/adapters/push";
import { getSmsSender } from "@/adapters/sms";
import { brand, contactLine } from "@/config/brand";
import {
  NOTIFICATION_CATEGORIES,
  TEMPLATES,
  type TemplateKey,
  type TemplateValues,
} from "@/config/notifications";
import {
  channelsFor,
  quietUntil,
  readPrefs,
  renderMessage,
  type Channel,
} from "@/domain/notifications";
import { TIME_ZONE } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

import { requestOrigin } from "./request";
import { getAllSettings } from "./settings";

/**
 * Notifications (brief §5). Every message to a person goes through
 * notify(): it's kept for the app, and sent by push, text or email by who
 * they are and what they've turned off, waiting out quiet hours unless
 * it's urgent. Looking up who to tell needs the service-role key.
 */

type Admin = ReturnType<typeof createAdminClient>;

/** Admins' wording for each template they've changed, for this request. */
const loadOverrides = cache(async () => {
  const { data, error } = await createAdminClient()
    .from("notification_templates")
    .select("key, title, body");
  if (error) throw new Error(`Couldn't load templates: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.key, row]));
});

/** A template as it's sent: an admin's wording, or the standard one. */
export async function templateText(
  key: TemplateKey,
): Promise<{ title: string; body: string }> {
  const override = (await loadOverrides()).get(key);
  return override ?? { title: TEMPLATES[key].title, body: TEMPLATES[key].body };
}

async function render<K extends TemplateKey>(
  key: K,
  values: TemplateValues<K>,
  url: string | undefined,
) {
  const link = url ? new URL(url, await requestOrigin()).toString() : "";
  return renderMessage(
    await templateText(key),
    { brand: brand.name, contact: contactLine(), ...values },
    link,
  );
}

export type NotifyOptions = {
  /** A page in the app: linked from texts and emails, and opened from the app. */
  url?: string;
  /** Sends it once only, however often it's asked for. */
  dedupeKey?: string;
  /** Sends it now, even in quiet hours (urgent templates always go). */
  urgent?: boolean;
};

/**
 * Tells someone something (brief §5). Never throws: a message that can't
 * be sent is logged, so it never undoes what the person just did.
 */
export async function notify<K extends TemplateKey>(
  key: K,
  profileId: string,
  values: TemplateValues<K>,
  options: NotifyOptions = {},
): Promise<void> {
  try {
    await createNotification(key, profileId, values, options);
  } catch (error) {
    console.error(`Couldn't send ${key} to ${profileId}`, error);
  }
}

/** Tells every admin. */
export async function notifyAdmins<K extends TemplateKey>(
  key: K,
  values: TemplateValues<K>,
  options: NotifyOptions = {},
): Promise<void> {
  const { data: admins } = await createAdminClient()
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .is("archived_at", null);
  for (const person of admins ?? []) {
    await notify(key, person.id, values, {
      ...options,
      dedupeKey: options.dedupeKey && `${options.dedupeKey}:${person.id}`,
    });
  }
}

/** Tells the owners of a business about their account. */
export async function notifyBusinessOwners<K extends TemplateKey>(
  key: K,
  businessId: string,
  values: TemplateValues<K>,
  options: NotifyOptions = {},
): Promise<void> {
  const { data: owners } = await createAdminClient()
    .from("business_users")
    .select("profile_id")
    .eq("business_id", businessId)
    .eq("role", "owner")
    .is("archived_at", null)
    .not("profile_id", "is", null);
  for (const owner of owners ?? []) {
    if (owner.profile_id) await notify(key, owner.profile_id, values, options);
  }
}

async function createNotification<K extends TemplateKey>(
  key: K,
  profileId: string,
  values: TemplateValues<K>,
  options: NotifyOptions,
) {
  const admin = createAdminClient();
  const template = TEMPLATES[key];
  const [{ data: person }, { count: devices }, settings, message] =
    await Promise.all([
      admin
        .from("profiles")
        .select("email, phone, notification_prefs, archived_at")
        .eq("id", profileId)
        .maybeSingle(),
      admin
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId),
      getAllSettings(),
      render(key, values, options.url),
    ]);
  if (!person || person.archived_at) return;
  const channels = channelsFor(
    {
      audience: template.audience,
      hasPush: (devices ?? 0) > 0,
      hasPhone: !!person.phone,
      hasEmail: !!person.email,
    },
    template.category,
    NOTIFICATION_CATEGORIES[template.category],
    readPrefs(person.notification_prefs),
  );
  const now = new Date();
  const urgent = ("urgent" in template && template.urgent) || !!options.urgent;
  const sendAfter = urgent
    ? now
    : (quietUntil(now, settings.quiet_hours, TIME_ZONE) ?? now);
  const { data: saved, error } = await admin
    .from("notifications")
    .upsert(
      {
        profile_id: profileId,
        template: key,
        title: message.title,
        body: message.short,
        message: message.text,
        url: options.url ?? null,
        channels,
        urgent,
        send_after: sendAfter.toISOString(),
        dedupe_key: options.dedupeKey ?? null,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(`Couldn't save it: ${error.message}`);
  const id = saved?.[0]?.id;
  if (id && sendAfter <= now) await deliver(admin, id);
}

/**
 * Sends one message by its channels, once: it's claimed first, so the
 * notifications job and the code that made it never both send it. A
 * worker whose devices all turned push off gets a text instead.
 */
async function deliver(admin: Admin, id: string): Promise<void> {
  const { data: claimed } = await admin
    .from("notifications")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", id)
    .is("sent_at", null)
    .select(
      "id, profile_id, template, title, body, message, url, channels, urgent, profiles(email, phone)",
    );
  const row = claimed?.[0];
  if (!row) return;
  const person = row.profiles;
  const failed: Channel[] = [];
  const recipient = person?.email ?? person?.phone ?? row.profile_id;
  const text = async () => {
    if (!person?.phone) throw new Error("No mobile number");
    await getSmsSender().send({
      to: person.phone,
      body: `${brand.name}: ${row.message}`,
      urgent: row.urgent,
    });
  };
  for (const channel of row.channels as Channel[]) {
    try {
      if (channel === "push") {
        const reached = await push(admin, row, recipient);
        if (!reached) {
          failed.push("push");
          if (!row.channels.includes("sms") && person?.phone) await text();
        }
      } else if (channel === "sms") {
        await text();
      } else {
        if (!person?.email) throw new Error("No email address");
        await getEmailSender().send({
          to: person.email,
          subject: row.title,
          text: row.message,
          tag: row.template,
        });
      }
    } catch (error) {
      console.error(`Couldn't send ${row.template} by ${channel}`, error);
      if (!failed.includes(channel)) failed.push(channel);
    }
  }
  if (failed.length > 0) {
    await admin
      .from("notifications")
      .update({ failed_channels: failed })
      .eq("id", row.id);
  }
}

/** Sends to each of the person's devices; true if any got it. */
async function push(
  admin: Admin,
  row: { profile_id: string; title: string; body: string; url: string | null },
  recipient: string,
): Promise<boolean> {
  const { data: devices } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", row.profile_id);
  let reached = false;
  for (const device of devices ?? []) {
    try {
      const result = await getPushSender().send(
        {
          endpoint: device.endpoint,
          keys: { p256dh: device.p256dh, auth: device.auth },
        },
        {
          recipient,
          title: row.title,
          body: row.body,
          url: row.url ?? undefined,
        },
      );
      if (result === "gone") {
        await admin.from("push_subscriptions").delete().eq("id", device.id);
      } else {
        reached = true;
        await admin
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", device.id);
      }
    } catch (error) {
      console.error("Couldn't push to a device", error);
    }
  }
  return reached;
}

/**
 * The notifications job: sends messages held through quiet hours, oldest
 * first. Run it every 10 minutes, like the others.
 */
export async function sendDueNotifications(limit = 200) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id")
    .is("sent_at", null)
    .lte("send_after", new Date().toISOString())
    .order("send_after")
    .limit(limit);
  if (error) throw new Error(`Couldn't find messages: ${error.message}`);
  for (const row of data ?? []) await deliver(admin, row.id);
  return { sent: (data ?? []).length };
}

/**
 * An email from a template to an address that may not be a user yet,
 * like a team invitation or an invoice to the accounts email. Throws if
 * it can't be sent.
 */
export async function emailTemplate<K extends TemplateKey>(
  key: K,
  to: string,
  values: TemplateValues<K>,
  options: { url?: string; attachments?: EmailAttachment[] } = {},
): Promise<void> {
  const message = await render(key, values, options.url);
  await getEmailSender().send({
    to,
    subject: message.title,
    text: message.text,
    tag: key,
    attachments: options.attachments,
  });
}
