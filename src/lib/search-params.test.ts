import { describe, expect, it } from "vitest";

import {
  choiceParam,
  idParam,
  listHref,
  pageParam,
  textParam,
} from "./search-params";

describe("list filters in the address", () => {
  const id = "0942eaa6-e0d1-4956-a62d-babcf825ae1f";

  it("read one trimmed value, ignoring repeats", () => {
    expect(textParam({ q: "  Ahmed " }, "q")).toBe("Ahmed");
    expect(textParam({ q: ["a", "b"] }, "q")).toBe("");
    expect(textParam({}, "q")).toBe("");
  });

  it("only accept ids and allowed choices", () => {
    expect(idParam({ category: id }, "category")).toBe(id);
    expect(idParam({ category: "1 or 1=1" }, "category")).toBeUndefined();
    expect(
      choiceParam({ status: "active" }, "status", ["active", "pending"]),
    ).toBe("active");
    expect(
      choiceParam({ status: "boss" }, "status", ["active", "pending"]),
    ).toBeUndefined();
  });

  it("count pages from 1", () => {
    expect(pageParam({ page: "3" })).toBe(3);
    expect(pageParam({ page: "0" })).toBe(1);
    expect(pageParam({ page: "2.5" })).toBe(1);
    expect(pageParam({})).toBe(1);
  });

  it("link to the same list with changes", () => {
    const params = { status: "active", q: "", page: "3" };
    expect(listHref("/admin/workers", params, { page: 4 })).toBe(
      "/admin/workers?status=active&page=4",
    );
    expect(listHref("/admin/workers", params, { page: 1 })).toBe(
      "/admin/workers?status=active",
    );
    // A new filter starts again from the first page.
    expect(listHref("/admin/workers", params, { status: "pending" })).toBe(
      "/admin/workers?status=pending",
    );
    expect(listHref("/admin/workers", params, { status: null })).toBe(
      "/admin/workers",
    );
  });
});
