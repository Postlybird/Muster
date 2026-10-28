import { describe, expect, it } from "vitest";

import {
  actionLabel,
  actorLabel,
  changedFields,
  recordLabel,
} from "./audit-format";

describe("the audit log in plain words", () => {
  it("names records and actions", () => {
    expect(recordLabel("worker_credentials")).toBe("Ticket");
    expect(recordLabel("mystery_things")).toBe("Mystery things");
    expect(actionLabel("update")).toBe("Changed");
    expect(actionLabel("view_documents")).toBe("Viewed documents");
    expect(actionLabel("export_payroll")).toBe("Export payroll");
  });

  it("says who did it", () => {
    expect(actorLabel("Alex Morgan", "admin")).toBe("Alex Morgan");
    expect(actorLabel(null, "service_role")).toBe("System");
    expect(actorLabel(null, "authenticated")).toBe("Someone");
  });

  it("lists what a change touched", () => {
    expect(
      changedFields(
        {
          status: "pending",
          expires_on: "2026-11-10",
          number: "[redacted]",
          updated_at: "2026-10-27T00:00:00Z",
        },
        {
          status: "verified",
          expires_on: "2026-11-10",
          number: "[redacted]",
          updated_at: "2026-10-28T00:00:00Z",
        },
      ),
    ).toEqual([{ field: "Status", from: "pending", to: "verified" }]);
    expect(changedFields(null, { level: 2 })).toEqual([
      { field: "Level", from: "—", to: "2" },
    ]);
  });
});
