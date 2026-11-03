# Questions to settle before launch

_Last updated: 03/11/2026_

Everything we still need answered before real shifts, grouped by who can answer it. Take each section to that person. When you have an answer, tell me in chat: I'll tick it off here with the date, note the decision in `PROGRESS.md`, and make any change it needs.

Never put keys, passwords or the margin in chat or in this file. The margin goes straight into Admin → Settings → Pay and billing, because the code is public.

For Claude, each session: read this file at the start. Tick answered questions (`[x]`, with the date and the answer), record decisions in `PROGRESS.md`, and add new questions here as they come up.

## 1. Your accountant

### Setting up

- [ ] **Company and tax registrations.** Is the company set up, with an ABN, and registered for GST and PAYG withholding? Both are needed before the first invoice and the first pay run.
- [ ] **The name "Shifta".** If the company's legal name is different, should we register "Shifta" as a business name with ASIC? Texts come from the sender name "Shifta", which Twilio registers against our ABN on the national Sender ID Register, and tax invoices show the legal name.
- [ ] **Bank account and cash.** A business bank account, and enough cash for 2–3 weeks of wages: workers are paid weekly, and businesses pay 14 days after their invoice.
- [ ] **The margin.** What margin should we charge on top of pay and on-costs? You type it into Admin yourself.
- [ ] **Payroll tax.** When do we have to register for NSW payroll tax, and what should the payroll tax on-cost be until then?
- [ ] **Portable long service leave.** NSW has portable long service leave schemes for contract cleaning and for building and construction. Do our cleaners or general labourers come under either, and what would we have to register for or pay? We think they might; please check.

### Pay rates and awards (Admin → Rates)

- [ ] **Overtime rules the pay guides don't spell out.** Please confirm, for casuals: overtime after 7.6 hours a day (cleaning, and removalist offsiders on the road transport award) and after 8 hours (building); overtime after 38 ordinary hours a week, Monday to Sunday; and ordinary hours of 7 am to 6 pm (building) and 5:30 am to 6:30 pm (road transport) on weekdays. Each is a box on the rate card, so it can change without code.
- [ ] **Which rates are overtime for super.** We now charge overtime without super, as super isn't owed on overtime. On each award, which other rates count as overtime? For example, are the building award's Saturday and Sunday rates overtime? Each rate card has a tick for each rate type.
- [ ] **Cleaners' meal allowance.** Shifta pays it when a cleaner works more than 2 hours past the booked finish, standing in for "more than 2 hours of overtime without notice the day before". Is that the right trigger and amount?
- [ ] **General labourers' fares and travel allowance.** Shifta pays it on every shift. Should it be once a day instead, if a worker has two shifts that day?
- [ ] **Furniture carter allowance.** Does the road transport award's weekly allowance ($27.39 a week) apply to our removalist offsiders? Shifta can't pay a weekly allowance yet; we'd add it.
- [ ] **The warehouse award.** Once you send me the Storage Services and Wholesale Award pay guide, I'll add it to the rates sheet for the accountant to check. Pick-packers, storepersons and forklift drivers can't be booked until then.
- [ ] **On-costs.** Are super (12%), payroll tax and insurance right in Admin → Settings → Pay and billing? The workers' compensation rate comes from the insurer (section 4).
- [ ] **Each 1 July.** Award rates change every year from 1 July. Who checks the new pay guides and the new rate cards, and by when? A rate card takes a start date, so new ones can go in ahead of time.

### Tax and the books

- [ ] **Do you keep the books in Xero?** If they would, Xero Payroll is worth a look (section 2), and a Xero plan would cover both. If not, a cheaper payroll app makes more sense.
- [ ] **BAS and tax return.** Shifta issues and tracks the invoices. Admin → Sales and GST shows sales, credit notes and payments by month, quarter or financial year, and downloads as a spreadsheet. It counts sales either by invoice date (accruals) or by payment (cash). Is that enough for the BAS, and which basis will we report on?
- [ ] **Company details for tax invoices.** The legal name, ABN, address, contact and bank account, entered in Admin → Settings → Pay and billing. The demo shows made-up ones.

## 2. The payroll provider

First choose one, then ask these in its free trial or demo. Nothing else in Shifta depends on which one.

The shortlist (03/11/2026; check prices before signing up):

- **Payroller** and **Microkeeper:** Australian, from a few dollars per worker a month.
- **Xero Payroll:** only inside a Xero accounting plan, priced by how many people are paid each month: about $37 a month for 1 person, up to about $300 for 100 (July 2026 prices). In Australia it has no upload of hours from a file, so hours are typed in per worker unless we build a direct link from Shifta, which its system allows. Worth it if the accountant keeps the books in Xero (section 1).
- **Employment Hero:** at least 10 people, so about $100 a month from the start.

Questions for each:

- [ ] **Price for casuals paid weekly.** Is it per person paid each month? Is there a minimum? As we grow, is it a fee per extra person, or a jump to the next plan?
- [ ] **Loading hours.** Can we upload each week's hours from a file? Please get its import template, or the list of columns, and send it to me, so Shifta's payroll file matches it exactly (it uses draft columns until then). Can it take hours straight from another system later (an API)?
- [ ] **Several awards and rates.** Can one casual work under more than one award in a week, with a pay item for each rate (ordinary, Saturday, Sunday, public holiday, overtime, early or late shift, night) and for each allowance?
- [ ] **Super on payday and Single Touch Payroll.** Does it pay super through its own clearing house, within 7 business days of payday (the law since 1 July 2026), and report through Single Touch Payroll Phase 2?
- [ ] **Worker set-up.** Can workers enter their own tax file number declaration, super fund and bank account in the payroll app? Shifta doesn't store tax file numbers.
- [ ] **Payslips and paying.** Does it send payslips, and does it pay workers itself or give us a bank file to upload?
- [ ] **Reports.** Wages by state (payroll tax), by work type (workers' compensation), and for long service leave, if section 1 says we need it.

## 3. Your lawyer (and a privacy adviser)

### The documents

The drafts are in Admin → Agreements and on the website, marked as drafts until approved.

- [ ] **Privacy policy, terms of use, and the privacy collection notice** workers see when they sign up.
- [ ] **Casual employment contract.** Workers sign it in the same paperwork step, before we've checked them, so it's worded as conditional on our checks passing. Is that right?
- [ ] **The Fair Work Information Statement and Casual Employment Information Statement.** Workers read them in the app, in the paperwork step of getting ready to work. Is that enough?
- [ ] **Information for workers supplied in South Australia.** Only needed if we open in SA.
- [ ] **Labour hire services agreement** (draft 0.2, waiting unpublished in Admin → Agreements). Please check, or add:
  - Hiring our workers directly: 15% of the first year's pay, plus GST, if a business takes on a worker within 180 days of their last shift through us. Is it fair, and can we enforce it?
  - Payment terms: 14 days now. Shorter? And interest on late payments and the cost of chasing them.
  - Late cancellations: each booking cancelled late is charged 3 hours for now.
  - Vehicles and forklifts: our workers drive them only if the business asks in writing and its insurance covers them.
  - The business supervises the work. Who's responsible for damage, losses, and cash or valuables our workers handle?
  - Rates can change with notice, such as each 1 July when awards change.
  - Police checks, driving records or drug tests when a business asks, at its cost.

### Other questions

- [ ] **What we keep about workers.** We plan to delete ID photos, selfies, citizenship evidence and police certificates once checked, keeping the outcome, date and reference. We keep ticket documents (businesses and insurers ask for them) and the record of each visa check. Is that right under the Privacy Act?
- [ ] **Our duties to casuals.** What do we owe casual employees under the Fair Work Act, for example when one asks to become permanent?
- [ ] **Texts and emails.** Our messages are about sign-in, bookings, hours and pay. Do any count as marketing under the Spam Act, needing consent and an unsubscribe link?
- [ ] **The trade mark "Shifta".** Should we apply now with IP Australia (likely classes 35, 9 and 42)?
- [ ] **Labour hire licences.** NSW has no licence scheme yet, though the government has promised one; we'll update its settings if it passes. QLD, VIC, SA and the ACT need a licence before we open there. How long does each take?

## 4. Your insurance broker

- [ ] **Workers' compensation** (icare in NSW), needed before anyone works. What's our premium rate for each work type? Labour hire is usually rated by the industry of the business the worker goes to. Each rate goes into Admin → Catalogues → Work types, where it's priced into every charge.
- [ ] **Public liability.** How much cover do businesses usually ask for? Construction and restoration sites often ask for a certificate of currency before workers arrive.
- [ ] **Anything else we need:** professional indemnity, cyber cover (we hold ID and visa details), and cover when our workers use a business's vehicles, forklifts or tools.

## 5. Your decisions

Only you can answer these. Until you do, Shifta uses the default shown, and each can change later.

- [ ] **Payroll provider:** which one, once the accountant has answered the Xero question.
- [ ] **Payment terms for businesses:** 14 days now, or shorter? (Admin → Settings → Pay and billing; the agreement should say the same.)
- [ ] **Weekly run day:** Monday now. Businesses have 48 hours to approve hours, so weekend shifts often miss Monday's run and are paid a week later. Wednesday would catch them.
- [ ] **Texts for bookings and reminders:** the brief keeps texts for sign-in and urgent work. Workers with the app get them as app notifications. Workers without it get texts now, a few cents each. Keep that?
- [ ] **Late cancellations:** should a worker who hadn't arrived yet be paid the 3 hours the business is charged? Not now. (A worker who has arrived is always paid at least the minimum engagement.)
- [ ] **Early starts and late finishes:** paid time starts at the rostered start even if a worker clocks in early, and a late finish is paid as clocked unless the business changes it. Or should both follow the roster unless the business approves extra time?
- [ ] **Changing a posted job:** a business can only cancel and post again now, because workers decide on what they were shown. Should they be able to change small things, like the instructions or who to report to?
- [ ] **Invoice extras:** a PO or reference number on jobs and invoices; the award and level on invoice lines; separate invoices for each branch. Which do you want?
- [ ] **Restoration:** every restoration job needs a White Card, and an IICRC ticket only when the business ticks it. Should every job need the IICRC WRT instead? And restoration labouring is charged at the technician rate: should we bring back a cheaper "Restoration labourer" (its rates are checked)?
- [ ] **How quickly we check new workers:** the app says "usually within two business days". Is that realistic?
- [ ] **Contact phone number** for the website and messages. Only the email shows until then.
- [ ] **Support email:** set up forwarding for support@shifta.com.au to your own inbox; most domain sellers offer it free.
- [ ] **Photos of people for the home page:** allow the photo library in this environment, or send photos you have the rights to.
- [ ] **Public or private code:** the GitHub repository is public, so anyone can read the code and the brief. Make it private?
- [ ] **The 10 questions in `docs/plan.md`:** Shifta uses our recommendations. Change any?

### Later (not needed to launch)

- [ ] **The next state after NSW.** It needs workers' compensation cover there (each state has its own scheme, like WorkSafe in Victoria), and a labour hire licence in QLD, VIC, SA and the ACT. Then you open it in Admin → States and licences, once its public holidays and tickets are in Admin.
- [ ] **Other states' public holidays:** allow the state government websites (like vic.gov.au, qld.gov.au and wa.gov.au) in the cloud environment's network settings, and I'll load them; or your team enters them in Admin from each state's official list.
- [ ] **Industries that need a licence:** security, aged care, disability support (NDIS), childcare and licensed trades are left out, as the business would need its own licence or registration first. Add any?
- [ ] **shifta.au:** buy it too, so nobody else can.
