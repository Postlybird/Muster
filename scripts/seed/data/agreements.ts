/**
 * DRAFT documents so the sign-up flows work end to end. None of this is
 * legal advice: every document must be written or reviewed by a lawyer
 * before launch (brief §12). The Fair Work statements are official
 * documents; we link to the current versions rather than copying them.
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
  title: string;
  body: string;
};

const draftNote =
  "> **Draft for demonstration only.** This document hasn't been reviewed by a lawyer and must not be used with real workers or businesses.";

export const AGREEMENT_VERSION = "0.1-draft";

export const AGREEMENTS: SeedAgreement[] = [
  {
    kind: "labour_hire_services",
    title: "Labour Hire Services Agreement (draft)",
    body: `${draftNote}

## 1. What we provide
We supply workers we employ to work at your sites under your day-to-day direction. We remain their employer: we pay them, and we hold workers' compensation insurance for them.

## 2. Safety
We share work health and safety duties for every placement. You'll describe the hazards and the controls in place, provide the site induction, and supervise the work. You'll tell us straight away about any incident or safety concern.

## 3. Rates and invoices
You pay the bill rates shown when you post work, plus GST. We invoice weekly for approved timesheets. Payment is due within the terms on the invoice.

## 4. Timesheets
Approve or dispute each timesheet within the approval window. If you don't, it's treated as approved.

## 5. Cancellations
Cancelling within the late cancellation window is charged under our cancellation policy.

## 6. Labour hire licensing
Where a state requires a labour hire licence, our licence number appears on this agreement and our invoices.

## 7. Ending this agreement
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
    body: `As your employer we must give you the Fair Work Information Statement. Read the current version on the Fair Work Ombudsman's website (fairwork.gov.au) by searching for "Fair Work Information Statement".

[Placeholder: attach or link the current official statement before launch.]
`,
  },
  {
    kind: "casual_employment_information_statement",
    title: "Casual Employment Information Statement",
    body: `As your employer we must give casual employees the Casual Employment Information Statement. Read the current version on the Fair Work Ombudsman's website (fairwork.gov.au) by searching for "Casual Employment Information Statement".

[Placeholder: attach or link the current official statement before launch.]
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
