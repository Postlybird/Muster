import { describe, expect, it } from "vitest";

import { renderInvoicePdf, type InvoicePdfData } from "./invoice-pdf";

const invoice: InvoicePdfData = {
  number: "INV-1001",
  issuedOn: "2026-10-28",
  dueOn: "2026-11-11",
  week: { start: "2026-10-19", end: "2026-10-25" },
  from: {
    legalName: "Example Labour Hire Pty Ltd",
    abn: "51824753556",
    address: "1 Example St, Sydney NSW 2000",
    email: "accounts@example.test",
    phone: "+61 2 0000 0000",
    licences: ["QLD 1234"],
  },
  to: {
    legalName: "HARBOUR RESTORATION PTY LTD",
    tradingName: "Harbour Restoration",
    abn: "12345678901",
    contact: "Mark Davies",
    email: "accounts@harbour.test",
  },
  lines: [
    {
      date: "2026-10-20",
      description: "Nguyễn An · Restoration labourer · Granville flood job",
      detail: "7:00 am to 3:30 pm, 30 min break. 8 h ordinary at $54.00/h.",
      hours: 8,
      amountCents: 43_200,
    },
  ],
  subtotalCents: 43_200,
  gstCents: 4_320,
  totalCents: 47_520,
  bank: { accountName: "Example", bsb: "062-000", accountNumber: "12345678" },
};

describe("invoice PDFs", () => {
  it("render", async () => {
    const pdf = await renderInvoicePdf(invoice);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
