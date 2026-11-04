import { describe, expect, it } from "vitest";

import {
  creditNoteOutcome,
  renderCreditNotePdf,
  renderInvoicePdf,
  type InvoicePdfData,
} from "./invoice-pdf";

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
      // A line saved before rows per rate (04/11/2026).
      date: "2026-10-20",
      description: "Nguyễn An · Restoration labourer · Granville flood job",
      detail: "7:00 am to 3:30 pm, 30 min break. 8 h ordinary at $54.00/h.",
      hours: 8,
      amountCents: 43_200,
    },
    {
      date: "2026-10-21",
      description: "Nguyễn An · Restoration labourer · Granville flood job",
      detail: "7:00 am to 4:00 pm, 30 min break",
      hours: 8.5,
      amountCents: 47_583,
      jobNumber: 1042,
      poNumber: "PO-4471/B",
      award: "Cleaning Services Award 2020, level 1",
      parts: [
        {
          label: "Ordinary",
          minutes: 456,
          rate_cents: 5400,
          amount_cents: 41_040,
        },
        {
          label: "Overtime",
          minutes: 54,
          rate_cents: 6800,
          amount_cents: 6120,
        },
        {
          label: "Meal allowance",
          minutes: null,
          rate_cents: null,
          amount_cents: 423,
        },
      ],
    },
  ],
  subtotalCents: 90_783,
  gstCents: 9_078,
  totalCents: 99_861,
  bank: { accountName: "Example", bsb: "062-000", accountNumber: "12345678" },
};

describe("invoice PDFs", () => {
  it("render", async () => {
    const pdf = await renderInvoicePdf(invoice);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });
});

describe("credit note PDFs", () => {
  const note = {
    number: "CN-1001",
    issuedOn: "2026-11-03",
    invoice: { number: invoice.number, issuedOn: invoice.issuedOn },
    reason: "An hour was charged twice on 20/10/2026.",
    from: invoice.from,
    to: invoice.to,
    subtotalCents: 5_400,
    gstCents: 540,
    totalCents: 5_940,
    owingCents: 41_580,
    invoicePaid: false,
  };

  it("render", async () => {
    const pdf = await renderCreditNotePdf(note);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("say what's left to pay, or that it's owed back", () => {
    expect(creditNoteOutcome(note)).toBe(
      "There's $415.80 still to pay on invoice INV-1001.",
    );
    expect(creditNoteOutcome({ ...note, owingCents: 0 })).toBe(
      "There's nothing more to pay on invoice INV-1001.",
    );
    expect(creditNoteOutcome({ ...note, invoicePaid: true })).toBe(
      "You've already paid invoice INV-1001, so we'll be in touch about the credit.",
    );
  });
});
