import { describe, expect, it } from "vitest";

import type { SalesLine } from "@/domain/sales";

import { csvMoney, csvText } from "./csv";
import { salesCsv } from "./sales-csv";

describe("spreadsheet fields", () => {
  it("quote text with commas, quotes or line breaks", () => {
    expect(csvText("Plain")).toBe("Plain");
    expect(csvText("Smith, Jones")).toBe('"Smith, Jones"');
    expect(csvText('A "quote"')).toBe('"A ""quote"""');
  });

  it("never let typed text run as a formula", () => {
    expect(csvText("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvText("+61")).toBe("'+61");
    expect(csvText("-1")).toBe("'-1");
    expect(csvText("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvText("=1,2")).toBe('"\'=1,2"');
  });

  it("write money as plain numbers", () => {
    expect(csvMoney(11_000)).toBe("110.00");
    expect(csvMoney(-1_100)).toBe("-11.00");
    expect(csvMoney(5)).toBe("0.05");
  });
});

describe("the sales spreadsheet", () => {
  const base = {
    invoice_id: "i",
    business_name: "WESTSIDE CLEANING PTY LTD",
    abn: "51824753556",
  };
  const lines: SalesLine[] = [
    {
      ...base,
      kind: "invoice",
      on_date: "2026-11-02",
      number: "INV-1001",
      invoice_number: "INV-1001",
      subtotal_cents: 10_000,
      gst_cents: 1_000,
      total_cents: 11_000,
      status: "issued",
      note: null,
    },
    {
      ...base,
      kind: "credit_note",
      on_date: "2026-11-03",
      number: "CN-1001",
      invoice_number: "INV-1001",
      subtotal_cents: -1_000,
      gst_cents: -100,
      total_cents: -1_100,
      status: null,
      note: "=charged twice, sorry",
    },
    {
      ...base,
      kind: "payment",
      on_date: "2026-11-04",
      number: "INV-1001",
      invoice_number: "INV-1001",
      subtotal_cents: 9_000,
      gst_cents: 900,
      total_cents: 9_900,
      status: "paid",
      note: "EFT 4471",
    },
  ];

  it("has a row for each invoice, credit note and payment", () => {
    expect(salesCsv(lines).split("\r\n")).toEqual([
      "\uFEFFType,Date,Number,Invoice,Business,ABN,Excluding GST,GST,Including GST,Notes",
      "Invoice,02/11/2026,INV-1001,INV-1001,WESTSIDE CLEANING PTY LTD,51 824 753 556,100.00,10.00,110.00,Unpaid",
      'Credit note,03/11/2026,CN-1001,INV-1001,WESTSIDE CLEANING PTY LTD,51 824 753 556,-10.00,-1.00,-11.00,"\'=charged twice, sorry"',
      "Payment,04/11/2026,INV-1001,INV-1001,WESTSIDE CLEANING PTY LTD,51 824 753 556,90.00,9.00,99.00,Reference EFT 4471",
      "",
    ]);
  });

  it("is just the header when there's nothing", () => {
    expect(salesCsv([])).toBe(
      "\uFEFFType,Date,Number,Invoice,Business,ABN,Excluding GST,GST,Including GST,Notes\r\n",
    );
  });
});
