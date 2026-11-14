import { FAIR_WORK_STATEMENTS } from "@/config/fair-work";

/**
 * DRAFT documents so the sign-up flows work end to end. None of this is
 * legal advice: every document is checked against the official guidance
 * and approved by the owner before launch (no lawyer: owner, 04/11/2026).
 * The Fair Work statements are official documents; we link to the current
 * versions rather than copying them.
 */
type SeedAgreement = {
  kind:
    | "labour_hire_services"
    | "casual_employment_contract"
    | "fair_work_information_statement"
    | "casual_employment_information_statement"
    | "privacy_collection_notice"
    | "worker_supply_notice";
  jurisdiction?: string;
  /** This document's own version, where it has moved on from AGREEMENT_VERSION. */
  version?: string;
  title: string;
  body: string;
};

const draftNote =
  "> **Draft.** This document hasn't been approved yet and must not be used with real workers or businesses.";

export const AGREEMENT_VERSION = "0.1-draft";

export const AGREEMENTS: SeedAgreement[] = [
  {
    kind: "labour_hire_services",
    // 0.3 (owner, 14/11/2026): 7-day terms, interest and costs on late
    // payments, the cancellation charge, who's responsible for what,
    // vehicles and forklifts, 30 days' notice of rate changes and checks on
    // request; each checked against the law's examples of unfair terms
    // (Australian Consumer Law, section 25). 0.4 (owner, 14/11/2026): no
    // placement fee, so businesses can hire our workers directly for free,
    // as the website says (the fee came in with 0.2).
    version: "0.4-draft",
    title: "Labour Hire Services Agreement (draft)",
    body: `${draftNote}

## 1. What we provide
We supply workers we employ to work at your sites under your day-to-day direction. We remain their employer: we pay their wages and super, withhold their tax, and hold workers' compensation insurance for them.

## 2. Safety
We share work health and safety duties for every placement. You'll describe the hazards and the controls in place, provide the site induction and any safety equipment the job needs beyond what we supply, and supervise the work safely. You'll tell us straight away about any incident or safety concern.

## 3. Directing the work, and who's responsible
You direct and supervise our workers while they're with you, as you would your own staff. So you're responsible for loss or damage that comes from:
- the work you ask them to do, and how it's directed and supervised;
- your site, equipment, materials and goods; and
- cash, keys, cards or valuables you give them to handle. Please don't ask our workers to handle cash unless we've agreed to it in writing.

We're responsible for loss or damage that comes from our negligence or our breach of this agreement (such as sending a worker without a ticket you asked for), or from a worker's dishonesty or deliberate wrongdoing. Neither of us is responsible for the other's indirect losses, such as lost profits.

## 4. Vehicles, forklifts and machinery
Our workers drive a vehicle, operate a forklift or use other plant for you only if you ask in writing first (by email, or in the job's details when you post it) and they hold the licence or ticket it needs. By asking, you confirm your insurance covers them while they drive or operate it, and you're responsible for damage to it, or caused by it, while they use it under your direction.

## 5. Rates, invoices and payment
You pay the charges shown when you post work, plus GST. We invoice each week for the hours approved and any late cancellations. Payment is due within 7 days of the invoice date, unless we've agreed other terms with you in writing.

If an invoice isn't paid by its due date, we can charge interest on the amount unpaid, from the due date until it's paid, at 4% a year above the Reserve Bank's cash rate, worked out daily (the rate NSW courts use for interest on debts before judgment). You'll also pay our reasonable costs of recovering an overdue amount, such as a collection agency's or lawyer's fees. Neither applies to an amount you've disputed with us in good faith before its due date, while we work it out together.

## 6. Timesheets
Approve or query each timesheet within 48 hours. If you don't, it's treated as approved.

## 7. Cancellations
If you cancel a booking less than 12 hours before it starts, we charge 3 hours at the shift's rate for each booked worker, as we pay the worker those hours. If the worker has already arrived, we charge at least the minimum engagement for the work.

## 8. Changes to our rates
We can change our rates and charges by telling you by email at least 30 days before the change starts, for example when award rates rise each 1 July. Shifts already booked keep the rates they were booked at. If you don't accept a change, you can end this agreement by telling us before it starts, and pay only for work already done. Changes to the rest of this agreement apply only once you accept them.

## 9. Extra checks
If you'd like a worker checked beyond what we do for everyone, such as a police check, a driving record or a drug and alcohol test, tell us. With the worker's consent we'll arrange it, and charge you what it costs us, which we'll tell you first.

## 10. Labour hire licensing
Where a state requires a labour hire licence, our licence number appears on this agreement and our invoices.

## 11. Hiring our workers yourself
You're welcome to offer any of our workers a job directly, with no placement fee.

## 12. Ending this agreement
Either of us can end this agreement by written notice. Work already completed is still payable.
`,
  },
  {
    kind: "casual_employment_contract",
    title: "Casual Employment Contract (draft)",
    body: `${draftNote}

## 1. Your employment
This offer of casual employment is conditional on us verifying your identity, right to work and the tickets you've provided. As a casual employee, there's no firm advance commitment to ongoing work. You can accept or decline any shift we offer.

## 2. Pay
You're paid the hourly rate shown for each shift, which includes casual loading, through our payroll provider.

## 3. Safety
Follow the safety instructions and use the PPE required for each shift. Use the "Report a safety issue" button if something isn't right.

## 4. Privacy and confidentiality
Keep information about the businesses you work for confidential. We handle your personal information as described in our privacy policy.

## 5. Ending employment
Either of us can end your employment with the notice required by law.
`,
  },
  {
    kind: "fair_work_information_statement",
    title: "Fair Work Information Statement",
    body: `As your employer we must give you the Fair Work Information Statement. Read the current version on the Fair Work Ombudsman's website: ${FAIR_WORK_STATEMENTS.fwis}

We also email you this link, so you keep a copy.
`,
  },
  {
    kind: "casual_employment_information_statement",
    title: "Casual Employment Information Statement",
    body: `As your employer we must give casual employees the Casual Employment Information Statement. Read the current version on the Fair Work Ombudsman's website: ${FAIR_WORK_STATEMENTS.ceis}

We also email you this link, so you keep a copy.
`,
  },
  {
    kind: "privacy_collection_notice",
    title: "Privacy collection notice (draft)",
    body: `${draftNote}

We collect your contact details, identity documents, right to work details, tickets and licences, police checks (where needed), and your location when you clock in and out.

We use this information to check you can legally and safely do the work, to offer you shifts, and to pay you. We share limited details (your preferred name, photo, rating and verified tickets) with businesses you apply to work for.

Our email and text message providers may process your contact details overseas. You can ask to see or correct your information at any time.
`,
  },
  {
    kind: "worker_supply_notice",
    jurisdiction: "SA",
    title: "Information for workers supplied in South Australia (draft)",
    body: `${draftNote}

[Placeholder: the information notice South Australian law requires us to give you each time we supply you to a business.]
`,
  },
];
