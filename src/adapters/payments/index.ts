/**
 * Getting paid by businesses (brief §4.8). v1: invoices on account terms,
 * paid by bank transfer and marked paid by an admin. Phase 2: Stripe (card
 * and BECS direct debit).
 */
export type InvoiceForPayment = {
  invoiceNumber: string;
  totalCents: number;
  /** yyyy-mm-dd */
  dueDate: string;
};

export type PaymentRequest = {
  method: "account_terms" | "stripe";
  status: "awaiting_payment" | "paid";
  /** Shown on the invoice. */
  instructions: string;
};

export interface PaymentCollector {
  readonly name: string;
  requestPayment(invoice: InvoiceForPayment): Promise<PaymentRequest>;
}

export class AccountTermsCollector implements PaymentCollector {
  readonly name = "account_terms";

  async requestPayment(invoice: InvoiceForPayment): Promise<PaymentRequest> {
    return {
      method: "account_terms",
      status: "awaiting_payment",
      instructions: `Please pay by bank transfer by the due date, quoting invoice ${invoice.invoiceNumber}.`,
    };
  }
}

export function getPaymentCollector(): PaymentCollector {
  return new AccountTermsCollector();
}
