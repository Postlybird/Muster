import { describe, expect, it, vi } from "vitest";

import { AbrAbnLookup, mapAbrResponse, unwrapJsonp } from "./abr";
import { DEMO_ABNS, MockAbnLookup } from "./mock";
import { formatAbn, isValidAbn, normaliseAbn } from "./validate";

describe("ABN validation", () => {
  it("accepts the ATO's example ABN", () => {
    expect(isValidAbn("51 824 753 556")).toBe(true);
  });

  it.each(["12 345 678 901", "51 824 753 557", "5182475355", "abc"])(
    "rejects %s",
    (abn) => {
      expect(isValidAbn(abn)).toBe(false);
    },
  );

  it("every demo ABN has a valid checksum", () => {
    for (const abn of Object.keys(DEMO_ABNS))
      expect(isValidAbn(abn)).toBe(true);
  });

  it("normalises and formats", () => {
    expect(normaliseAbn("51-824 753.556")).toBe("51824753556");
    expect(formatAbn("51824753556")).toBe("51 824 753 556");
  });
});

const activeBody = `callback({"Abn":"51824753556","AbnStatus":"Active","AbnStatusEffectiveFrom":"2000-07-01","Acn":"","AddressDate":"2015-01-01","AddressPostcode":"2600","AddressState":"ACT","BusinessName":[],"EntityName":"AUSTRALIAN TAXATION OFFICE","EntityTypeCode":"CGE","EntityTypeName":"Commonwealth Government Entity","Gst":"2000-07-01","Message":""})`;

describe("ABN Lookup (JSONP) responses", () => {
  it("unwraps JSONP", () => {
    expect(unwrapJsonp(activeBody)).toMatchObject({ Abn: "51824753556" });
  });

  it("maps an active, GST-registered ABN", () => {
    const result = mapAbrResponse(unwrapJsonp(activeBody));
    expect(result).toEqual({
      found: true,
      details: expect.objectContaining({
        abn: "51824753556",
        status: "active",
        entityName: "AUSTRALIAN TAXATION OFFICE",
        gstRegisteredFrom: "2000-07-01",
        acn: null,
        state: "ACT",
      }),
    });
  });

  it("maps a cancelled, non-GST ABN", () => {
    const body = activeBody
      .replace('"Active"', '"Cancelled"')
      .replace('"Gst":"2000-07-01"', '"Gst":null');
    const result = mapAbrResponse(unwrapJsonp(body));
    expect(result.found && result.details.status).toBe("cancelled");
    expect(result.found && result.details.gstRegisteredFrom).toBeNull();
  });

  it("reports ABN Lookup's message when nothing is found", () => {
    const body = `callback({"Abn":"","AbnStatus":"","Message":"Search text is not a valid ABN or ACN"})`;
    expect(mapAbrResponse(unwrapJsonp(body))).toEqual({
      found: false,
      reason: "not_found",
      message: "Search text is not a valid ABN or ACN",
    });
  });

  it("calls the service with the GUID and unwraps the reply", async () => {
    const fetcher = vi.fn(
      async () => new Response(activeBody, { status: 200 }),
    );
    const result = await new AbrAbnLookup(
      "test-guid",
      fetcher as unknown as typeof fetch,
    ).lookup("51 824 753 556");
    const url = new URL(String((fetcher.mock.calls[0] as unknown[])[0]));
    expect(url.searchParams.get("abn")).toBe("51824753556");
    expect(url.searchParams.get("guid")).toBe("test-guid");
    expect(result.found).toBe(true);
  });

  it("doesn't call the service for an invalid ABN", async () => {
    const fetcher = vi.fn();
    const result = await new AbrAbnLookup(
      "g",
      fetcher as unknown as typeof fetch,
    ).lookup("123");
    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toMatchObject({ found: false, reason: "invalid" });
  });

  it("says the service is unavailable when the request fails", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network down");
    });
    const result = await new AbrAbnLookup(
      "g",
      fetcher as unknown as typeof fetch,
    ).lookup("51824753556");
    expect(result).toMatchObject({ found: false, reason: "unavailable" });
  });
});

describe("mock ABN lookup", () => {
  const mock = new MockAbnLookup();

  it("knows the demo businesses, including a cancelled one", async () => {
    const cancelled = await mock.lookup("74 077 011 037");
    expect(cancelled.found && cancelled.details.status).toBe("cancelled");
  });

  it("invents an active business for other valid ABNs", async () => {
    const result = await mock.lookup("51 824 753 556");
    expect(result.found && result.details.status).toBe("active");
  });

  it("rejects invalid ABNs", async () => {
    expect(await mock.lookup("12 345 678 901")).toMatchObject({
      found: false,
      reason: "invalid",
    });
  });
});
