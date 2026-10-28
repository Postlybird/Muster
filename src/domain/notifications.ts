import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import type {
  Audience,
  CategoryDefinition,
  NotificationCategory,
} from "@/config/notifications";

/**
 * Notifications (brief §5): filling in templates, choosing where each
 * message goes, and holding non-urgent ones through quiet hours.
 */

export type Channel = "push" | "sms" | "email";

const PLACEHOLDER = /\{\{\s*([^{}]*?)\s*\}\}/g;

/**
 * Fills `{{name}}` placeholders (unknown ones are left empty) and tidies
 * the gaps empty values leave: doubled spaces and empty paragraphs.
 */
export function fillTemplate(
  text: string,
  values: Readonly<Record<string, string>>,
): string {
  return text
    .replace(PLACEHOLDER, (_, name: string) => values[name] ?? "")
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Problems with a template an admin wrote: placeholders it can't fill. */
export function templateProblems(
  text: string,
  allowed: readonly string[],
): string[] {
  const unknown = [
    ...new Set(
      [...text.matchAll(PLACEHOLDER)]
        .map((match) => match[1]!)
        .filter((name) => !allowed.includes(name)),
    ),
  ];
  const problems = unknown.map(
    (name) => `{{${name}}} isn't something this message can fill in`,
  );
  const stray = text.replace(PLACEHOLDER, "");
  if (stray.includes("{{") || stray.includes("}}")) {
    problems.push("Each placeholder needs {{ and }} around its name");
  }
  return problems;
}

const LINK_MARK = "\u0000";

/**
 * A message as text and email show it (with the link), and as the app and
 * push notifications show it, where tapping opens the link: the sentence
 * with the link is left out.
 */
export function renderMessage(
  template: { title: string; body: string },
  values: Readonly<Record<string, string>>,
  link: string,
): { title: string; text: string; short: string } {
  const marked = fillTemplate(template.body, { ...values, link: LINK_MARK });
  const at = marked.indexOf(LINK_MARK);
  let short = marked;
  if (at >= 0) {
    const before = marked.slice(0, at);
    const start = Math.max(
      before.lastIndexOf(". ") + 1,
      before.lastIndexOf("? ") + 1,
      before.lastIndexOf("! ") + 1,
      before.lastIndexOf("\n") + 1,
      0,
    );
    const after = marked.slice(at + 1);
    const end = after.search(/[.!?](\s|$)|\n/);
    short = fillTemplate(
      `${marked.slice(0, start)}${end >= 0 ? after.slice(end + 1) : ""}`,
      {},
    );
  }
  return {
    title: fillTemplate(template.title, { ...values, link }),
    text: fillTemplate(template.body, { ...values, link }),
    short: short.replaceAll(LINK_MARK, ""),
  };
}

export type NotificationPrefs = Partial<Record<NotificationCategory, boolean>>;

/** Stored preferences, ignoring anything that isn't a yes or no. */
export function readPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter(([, value]) => typeof value === "boolean"),
  ) as NotificationPrefs;
}

/**
 * Where a message goes (brief §5). Workers get push notifications in the
 * installed app, or texts if they haven't installed it, and urgent
 * call-outs by text as well. Businesses and our team get emails. A
 * category someone turned off stays in the app only, unless it's critical.
 */
export function channelsFor(
  recipient: {
    audience: Audience;
    hasPush: boolean;
    hasPhone: boolean;
    hasEmail: boolean;
  },
  category: NotificationCategory,
  definition: CategoryDefinition,
  prefs: NotificationPrefs,
): Channel[] {
  if (!definition.critical && prefs[category] === false) return [];
  if (recipient.audience !== "worker") {
    return recipient.hasEmail ? ["email"] : [];
  }
  const channels: Channel[] = [];
  if (recipient.hasPush) channels.push("push");
  if (
    recipient.hasPhone &&
    (!recipient.hasPush || category === "urgent_work")
  ) {
    channels.push("sms");
  }
  return channels;
}

function addDay(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * When quiet hours end, if `now` falls in them (brief §5: no non-urgent
 * messages overnight), or null. Times are local "HH:MM"; the same start
 * and end means no quiet hours.
 */
export function quietUntil(
  now: Date,
  quiet: { start: string; end: string },
  timeZone: string,
): Date | null {
  if (quiet.start === quiet.end) return null;
  const local = formatInTimeZone(now, timeZone, "HH:mm");
  const overnight = quiet.start > quiet.end;
  const inQuiet = overnight
    ? local >= quiet.start || local < quiet.end
    : local >= quiet.start && local < quiet.end;
  if (!inQuiet) return null;
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const endDay = overnight && local >= quiet.start ? addDay(today) : today;
  return fromZonedTime(`${endDay}T${quiet.end}:00`, timeZone);
}
