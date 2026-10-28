import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  dollarsToCents,
  formBoolean,
  invalid,
  optionalText,
  toCode,
} from "./forms";

describe("form helpers", () => {
  it("makes catalogue codes from names", () => {
    expect(toCode("Restoration labourer")).toBe("restoration_labourer");
    expect(toCode("  IICRC WRT  ")).toBe("iicrc_wrt");
    expect(toCode("Contents & pack-out crew")).toBe("contents_pack_out_crew");
    expect(toCode("3M respirator")).toBe("x_3m_respirator");
    expect(toCode("!!!")).toBe("item");
  });

  it("reads checkboxes, optional text and dollars", () => {
    expect(formBoolean("on")).toBe(true);
    expect(formBoolean(null)).toBe(false);
    expect(optionalText("  ")).toBeNull();
    expect(optionalText(" hi ")).toBe("hi");
    expect(dollarsToCents("$27.50")).toBe(2750);
    expect(dollarsToCents("1,234")).toBe(123400);
    expect(dollarsToCents("")).toBeNull();
    expect(dollarsToCents("12.345")).toBeNaN();
  });

  it("turns validation errors into field messages", () => {
    const result = z
      .object({ name: z.string().min(1, "Enter a name") })
      .safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(invalid(result.error)).toEqual({
        status: "error",
        message: "Check the highlighted fields.",
        fieldErrors: { name: ["Enter a name"] },
      });
    }
  });
});

describe("requiredNumber", () => {
  it("rejects an empty box instead of treating it as zero", async () => {
    const { requiredNumber } = await import("./forms");
    const schema = requiredNumber("Enter hours");
    expect(schema.safeParse("").success).toBe(false);
    expect(schema.safeParse("4.5").data).toBe(4.5);
  });
});
