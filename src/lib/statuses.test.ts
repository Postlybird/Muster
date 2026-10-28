import { describe, expect, it } from "vitest";

import { businessStatuses, checkStatuses, workerStatuses } from "./statuses";

describe("status wording", () => {
  const all = { ...workerStatuses, ...checkStatuses, ...businessStatuses };

  it.each(Object.entries(all))(
    "%s has a label and a 'what happens next'",
    (_key, info) => {
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.next).toMatch(/[.]$/);
    },
  );
});
