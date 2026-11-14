import { brand } from "@/config/brand";
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
    // as the website says (the fee came in with 0.2). 1.0: 0.4 as the owner
    // approved it (14/11/2026), without the draft label.
    version: "1.0",
    title: "Labour Hire Services Agreement",
    body: `## 1. What we provide
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
    // 0.2 (14/11/2026): checked against Fair Work's rules as they stand,
    // including the casual definition and the employee choice pathway to
    // permanent work (Fair Work Act, from 2024 and 2025), for the owner to
    // approve.
    version: "0.2-draft",
    title: "Casual Employment Contract (draft)",
    body: `${draftNote}

## 1. Your job
We're a labour hire business. We employ you as a casual employee to work shifts at businesses that book our workers (hosts). You stay our employee the whole time: we pay you, and we hold workers' compensation insurance for you.

This offer depends on our checks: your identity, your right to work in Australia, the tickets and licences the work needs and, where the work needs it, a police check. Your employment starts when we activate your account after the checks.

## 2. Casual employment
There's no firm advance commitment to ongoing work: we offer shifts when hosts need workers, and you choose which to take. You can turn down any shift, and we don't guarantee any hours.

After 6 months (12 months while we have fewer than 15 employees), if you believe you're no longer a casual employee, for example because you work a regular pattern of hours, you can tell us in writing that you'd like to become permanent. We'll talk with you and reply in writing within 21 days. The Casual Employment Information Statement explains this. You get it when you start, and we email it to you again at 6 months, 12 months and every year after.

## 3. Pay and super
For each shift you're paid at least the casual rate for the work under its award, which includes the casual loading paid instead of leave and some other entitlements of permanent staff. Weekend, public holiday, overtime and shift rates, and allowances, are paid as the award says. Each shift shows its hourly rate before you take it, and your timesheet shows how your pay adds up.

If the Fair Work Commission has made a "same job, same pay" order covering a host, you're paid at least what the order requires while you work there.

We pay you each week, into your bank account through our payroll provider, for the hours approved the week before, with a payslip. We pay super into your chosen fund on payday.

## 4. Hours and timesheets
You're paid for at least the minimum hours the award sets for each shift, even if the work finishes early. Take your breaks as the award says. Clock in and out in the app; the host approves your hours, and you can query them if they're wrong.

If your visa limits the hours you can work, don't take shifts that would go over it, and tell us straight away if your visa changes.

## 5. Safety
Follow the host's safety instructions and site induction, wear the PPE the job needs, and stop work and tell us if something's unsafe ("Report a safety issue" in the app). Only drive a vehicle, operate a forklift or use other plant if you hold the licence or ticket it needs and we've agreed the host can ask you to.

## 6. At a host's site
Follow the host's reasonable directions about the work. Keep the host's and their customers' information confidential, during and after your employment, and don't take their property.

## 7. Your information
We handle your personal information as our privacy policy and collection notice explain.

## 8. Your rights
This contract never takes away your rights under the Fair Work Act, the National Employment Standards or your award: if anything in it gives you less, the law applies instead. You can ask the Fair Work Ombudsman about your rights at any time, on 13 13 94.

## 9. Ending your employment
Either of us can end your employment by telling the other, with any notice your award requires. Shifts you've already worked are paid.
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
    // 0.2 (14/11/2026): checked against the Australian Privacy Principles
    // (APP 5's notice, and APP 1's new rule on decisions made by computer
    // programs, from 10/12/2026), for the owner to approve.
    version: "0.2-draft",
    title: "Privacy collection notice (draft)",
    body: `${draftNote}

${brand.name} is the labour hire business that employs you. Contact us about your information at ${brand.supportEmail}.

## What we collect, and why
- Your name, date of birth, contact details, suburb and photo, to employ you and offer you work near you.
- Your right to work: citizenship evidence, or your passport and visa details, which we check with the Department of Home Affairs (VEVO). The law requires us to check it.
- Photo ID and a selfie, which our team checks to confirm who you are. We delete the images once they're checked.
- Your tickets and licences, and police check results only with your consent and where the work needs it. We delete police certificates once they're checked.
- Your availability, the shifts you take, your hours, ratings and reliability, safety reports, and where your phone is when you clock in and out.

We also get information about you from others: visa details from Home Affairs, police check results, and ratings and reports from businesses you work for.

If you don't give us your identity, right to work and the tickets the work needs, we can't employ you or offer you that work.

## Who sees it
Businesses you're offered to or work for see your preferred name, photo, rating, reliability and verified tickets, never your documents. Our payroll provider gets what it needs to pay you. Our email, text, address search, bot check and app notification providers handle some of your details overseas, mainly in the United States.

## Decisions the app makes
The app decides which shifts you're offered, from your tickets, right to work, location, availability and reliability, and puts your account on hold after two no-shows within 30 days until our team reviews it.

## Your choices
You can see and update most of your details in the app, and ask us for a copy, a correction, or to make a complaint. Our [privacy policy](/privacy) explains more, including how to complain to the Australian Information Commissioner.
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
