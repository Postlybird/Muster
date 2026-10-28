import { describe, expect, it } from "vitest";

import { NOTIFICATION_CATEGORIES } from "@/config/notifications";

import {
  channelsFor,
  fillTemplate,
  quietUntil,
  readPrefs,
  renderMessage,
  templateProblems,
} from "./notifications";

const SYDNEY = "Australia/Sydney";

describe("filling in templates", () => {
  it("puts in each value and tidies what empty ones leave", () => {
    expect(
      fillTemplate(
        "Hi {{name}}, {{ note }} see {{place}}.\n\n{{extra}}\n\nBye",
        {
          name: "Priya",
          note: "",
          place: "Blacktown",
          extra: "",
        },
      ),
    ).toBe("Hi Priya, see Blacktown.\n\nBye");
  });

  it("never fills in placeholders inside values", () => {
    expect(fillTemplate("{{a}}", { a: "{{b}}", b: "no" })).toBe("{{b}}");
  });

  it("finds placeholders a message can't fill, and broken ones", () => {
    expect(
      templateProblems("Hi {{name}} from {{shop}}", ["name", "link"]),
    ).toEqual(["{{shop}} isn't something this message can fill in"]);
    expect(templateProblems("Hi {{name", ["name"])).toEqual([
      "Each placeholder needs {{ and }} around its name",
    ]);
    expect(templateProblems("Hi {{name}}", ["name"])).toEqual([]);
  });
});

describe("messages", () => {
  const template = {
    title: "You're booked",
    body: "You're booked: {{work}} in {{suburb}}. See the address: {{link}}",
  };

  it("show the link in texts and emails, and leave its sentence out in the app", () => {
    expect(
      renderMessage(
        template,
        { work: "Commercial cleaner", suburb: "Blacktown" },
        "https://example.com/worker/shifts/1",
      ),
    ).toEqual({
      title: "You're booked",
      text: "You're booked: Commercial cleaner in Blacktown. See the address: https://example.com/worker/shifts/1",
      short: "You're booked: Commercial cleaner in Blacktown.",
    });
  });

  it("keep a quoted sentence before the link", () => {
    expect(
      renderMessage(
        {
          title: "Hours changed",
          body: "They set your hours. {{note}} If that's not right, query them: {{link}}",
        },
        { note: '"You left early."' },
        "https://example.com/t/1",
      ).short,
    ).toBe('They set your hours. "You left early."');
  });

  it("keep what follows a link in the middle", () => {
    expect(
      renderMessage(
        {
          title: "Ready",
          body: "Post work now: {{link}}\n\nWe invoice weekly.",
        },
        {},
        "https://example.com/post",
      ).short,
    ).toBe("We invoice weekly.");
  });
});

describe("where messages go", () => {
  const worker = {
    audience: "worker" as const,
    hasPush: false,
    hasPhone: true,
    hasEmail: true,
  };
  const reminders = NOTIFICATION_CATEGORIES.reminders;

  it("texts workers who haven't installed the app, and pushes to those who have", () => {
    expect(channelsFor(worker, "reminders", reminders, {})).toEqual(["sms"]);
    expect(
      channelsFor({ ...worker, hasPush: true }, "reminders", reminders, {}),
    ).toEqual(["push"]);
  });

  it("texts urgent call-outs as well", () => {
    expect(
      channelsFor(
        { ...worker, hasPush: true },
        "urgent_work",
        NOTIFICATION_CATEGORIES.urgent_work,
        {},
      ),
    ).toEqual(["push", "sms"]);
  });

  it("emails businesses and our team", () => {
    expect(
      channelsFor(
        { ...worker, audience: "business" },
        "timesheets",
        NOTIFICATION_CATEGORIES.timesheets,
        {},
      ),
    ).toEqual(["email"]);
  });

  it("keeps what someone turned off in the app, unless it's critical", () => {
    const prefs = readPrefs({ reminders: false, account: false, junk: "x" });
    expect(prefs).toEqual({ reminders: false, account: false });
    expect(channelsFor(worker, "reminders", reminders, prefs)).toEqual([]);
    expect(
      channelsFor(worker, "account", NOTIFICATION_CATEGORIES.account, prefs),
    ).toEqual(["sms"]);
  });
});

describe("quiet hours", () => {
  const quiet = { start: "21:00", end: "06:00" };

  it("hold messages overnight until they end", () => {
    // 10:30 pm and 1:30 am in Sydney (daylight saving: UTC+11).
    expect(quietUntil(new Date("2026-11-04T11:30:00Z"), quiet, SYDNEY)).toEqual(
      new Date("2026-11-04T19:00:00Z"),
    );
    expect(quietUntil(new Date("2026-11-04T14:30:00Z"), quiet, SYDNEY)).toEqual(
      new Date("2026-11-04T19:00:00Z"),
    );
  });

  it("let messages go during the day, or when there are none", () => {
    expect(quietUntil(new Date("2026-11-04T23:00:00Z"), quiet, SYDNEY)).toBe(
      null,
    );
    expect(
      quietUntil(
        new Date("2026-11-04T14:30:00Z"),
        { start: "00:00", end: "00:00" },
        SYDNEY,
      ),
    ).toBe(null);
  });
});
