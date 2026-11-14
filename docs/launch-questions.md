# Questions to settle before launch

_Last updated: 14/11/2026_

Everything we still need to settle before real shifts. There's no paid accountant, lawyer, insurance broker or payroll professional (owner, 04/11/2026): you make every decision, and we work each one out together. For each question I research the official sources and give a recommendation; you decide, or check it with the free government services below first. When you decide, tell me in chat: I'll tick it off here with the date, note the decision in `PROGRESS.md`, and make any change it needs.

Some answers are set by law rather than by choice: workers' compensation insurance before anyone works, paying at least the award, and registering for PAYG withholding before the first pay run. Those are marked **The law**.

Never put keys, passwords or the margin in chat or in this file. The margin goes straight into Admin → Settings → Pay and billing, because the code is public.

For Claude, each session: read this file at the start. Tick decided questions (`[x]`, with the date and the decision), record decisions in `PROGRESS.md`, add new questions here as they come up, and research each from official sources before recommending. Some official sites are blocked from the build environment (nsw.gov.au, longservice.nsw.gov.au, accc.gov.au); say so when a recommendation rests on search summaries rather than the official page.

## Free help

These cost nothing, and their answers carry more weight than mine:

- **Fair Work Ombudsman small business helpline, 13 13 94:** pay, awards and casual employment.
- **Fair Work's Employer Advisory Service:** free written advice on award pay and entitlements for businesses with fewer than 15 employees. If you follow its advice in good faith and it turns out to be wrong, Fair Work won't seek penalties (you still pay what's owed). Use it for the award questions in section 4 while we're small; I'll write the enquiry for you to send.
- **icare:** NSW workers' compensation, quotes and how our workers are classified.
- **The Long Service Corporation:** NSW's portable long service leave schemes for cleaning and for building and construction.
- **The ATO and Revenue NSW:** registrations, GST, BAS and payroll tax.
- **The OAIC** (privacy) and **the ACCC** (unfair contract terms): guides we check our documents against.

## 1. The business and tax

- [x] **Company or sole trader?** Decided 04/11/2026: a company, Shifta Pty Ltd, which you'll register with ASIC in January 2027, when you're back from Brazil. Until then there's no ABN, so real shifts, the paid accounts and the text sender name wait for it.
- [x] **GST.** Decided 04/11/2026: register in January 2027, with the company (free, with the ATO).
- [x] **GST basis.** Decided 14/11/2026: cash, reporting GST when businesses pay, which any business turning over less than $10 million can choose. Choose it when you register for GST in January; Shifta's Sales and GST page says what goes at G1 and 1A.
- [ ] **PAYG withholding.** **The law:** register before the first pay run (free), with the company in January. The payroll app works out each worker's tax and reports it to the ATO every payday; you pay it with your BAS, quarterly while you withhold $25,000 a year or less.
- [x] **The BAS.** Decided 14/11/2026: quarterly, lodged by you, free, in the ATO's Online services for business: GST on sales from Shifta's Sales and GST page, GST on your own costs from receipts and bank statements, and tax withheld from the payroll app.
- [x] **Payroll tax.** Decided and built 14/11/2026: 0% in prices for now. NSW charges 5.45%, but only on wages above $1.2 million a year (2026–27, unchanged; Admin → Settings → Pay and billing has the threshold). The admin dashboard warns once wages with super pass 80% of it over the last 12 months, or of its monthly share over the last 30 days: then register with Revenue NSW and set the payroll tax on-cost.
- [ ] **The company's tax return** (later: the first is for the year to 30 June 2027). It can't be lodged in the ATO's online services: it's a paper return, tax software, or a tax agent. Not needed to launch.
- [ ] **Bank account and cash.** A business bank account, and cash for 2–3 weeks of wages: workers are paid weekly, and businesses pay after their invoice is due (see payment terms, section 6).
- [ ] **The margin.** **Recommendation:** we work it out from your yearly costs (insurance, the payroll app, texts and email, hosting, unpaid invoices) and what you want to earn, checked against what other agencies charge for the same work. I'll list the costs once the quotes are in; you type the result into Admin.
- [x] **The name "Shifta".** Decided 04/11/2026: the company itself will be Shifta Pty Ltd (if ASIC shows the name is free), so there's no separate business name to register. Twilio registers the text sender name "Shifta" against its ABN.

## 2. Insurance

- [ ] **Workers' compensation.** **The law:** in NSW you need it before anyone works. Buy it straight from icare online; there's no need for a broker. The premium is wages times the rate for your industry: about 1.8% across all NSW industries, usually higher for building, warehouse and removal work. **Recommendation:** get icare's quote describing us as labour hire supplying labourers, cleaners, restoration, warehouse and removalist workers to other businesses, and ask how on-hired workers are classified (whether by the business they go to). Then I'll show you where each work type's rate goes (Admin → Catalogues → Work types); it's a 5% placeholder until then.
- [ ] **Public liability.** Not required by law for everyone, but businesses, building sites especially, ask for $20 million cover and a certificate of currency before workers arrive. For $20 million, small businesses pay roughly $750–$1,800 a year at low risk and $2,400–$5,000 or more at higher risk; labour hire sits at the higher end. **Recommendation:** get two or three quotes online for "labour hire" with $20 million cover, and check the policy covers our workers at other businesses' sites. Its cost goes into the insurance on-cost.
- [x] **Anything else** (professional indemnity, cyber, vehicles and equipment). Decided 14/11/2026: not at launch. The business agreement will say the business insures its own vehicles, forklifts and tools (section 5).

## 3. Payroll

The options (03/11/2026; check prices when you sign up):

- **Payroller:** 99c per worker a month for the first 6 months (a current offer), then $3.99 per worker a month paid yearly ($15.96 minimum) or $5.50 monthly ($22 minimum). It says super on payday is included in every plan.
- **Microkeeper:** from $2.25 per worker a month for payroll only; $6 for the standard plan.
- **Xero Payroll:** only with a Xero accounting plan, about $143 a month for 10 people. Not worth it without an accountant who works in Xero.
- **Employment Hero:** at least 10 people, about $100 a month from the start.

- [ ] **Which one?** **Recommendation:** Payroller's free trial first, as the cheapest with super on payday included. If it fails the checks below, try Microkeeper.

In the trial, check:

- [ ] **Loading hours.** Can we upload each week's hours from a file? If so, send me its import template, or the list of columns, so Shifta's payroll file matches it exactly (it uses draft columns until then). If not, someone types each worker's hours in every week, which is fine for a handful of workers.
- [ ] **Several pay rates.** Can one casual have a pay item for each rate (ordinary, Saturday, Sunday, public holiday, overtime, early or late shift, night) and each allowance, under more than one award in a week? Shifta works out the rates; the app only pays them.
- [ ] **Super on payday and Single Touch Payroll.** **The law:** since 1 July 2026, super reaches each worker's fund within 7 business days of payday, and pay is reported through Single Touch Payroll. Check it pays super through its own clearing house.
- [ ] **Worker set-up.** Can workers enter their own tax file number declaration, super fund and bank account in the app? Shifta doesn't store tax file numbers.
- [ ] **Payslips and paying.** Does it send payslips, and does it pay workers itself or give us a bank file to upload?
- [ ] **Reports.** Wages by work type for icare's yearly declaration, and for long service leave (section 4).

## 4. Pay rates and awards

The rates for the launch work types were checked by your accountant (01/11/2026). The questions the pay guides don't answer go to Fair Work's Employer Advisory Service, for free written advice; I'll write the enquiry.

- [ ] **Overtime rules.** For casuals: overtime after 7.6 hours a day (cleaning, and removalist offsiders on the road transport award) and after 8 hours (building); after 38 ordinary hours a week, Monday to Sunday; and ordinary hours of 7 am to 6 pm (building) and 5:30 am to 6:30 pm (road transport) on weekdays. **Recommendation:** keep them (they follow the awards as we read them) and send them to the Employer Advisory Service. Each is a box on the rate card.
- [ ] **Which rates are overtime for super.** Super isn't owed on overtime, so we charge it without super. **Recommendation:** ask the Employer Advisory Service whether the building award's Saturday and Sunday rates count as overtime, and tick them on its card if so.
- [ ] **Cleaners' meal allowance.** Shifta pays it when a cleaner works more than 2 hours past the booked finish, standing in for "more than 2 hours of overtime without notice the day before". **Recommendation:** keep, and include it in the enquiry.
- [x] **General labourers' fares and travel allowance.** Decided and built 14/11/2026: paid once a day, as the award says each day worked: with the first shift booked that day, so the business whose booking came first is charged it. It stays in the Employer Advisory Service enquiry.
- [ ] **Furniture carter allowance.** Does the road transport award's weekly allowance ($27.39 a week) apply to removalist offsiders? **Recommendation:** include it in the enquiry; if it applies, I'll add weekly allowances.
- [ ] **The warehouse award.** Send me the Storage Services and Wholesale Award pay guide from the Fair Work website; I'll prepare the rate cards and you check them against the pay guide. Pick-packers, storepersons and forklift drivers can't be booked until then.
- [ ] **Super.** **The law:** 12% of ordinary pay since 1 July 2025; that's the setting.
- [x] **Each 1 July.** Decided 14/11/2026: each June, you send me the new pay guides, I prepare the new rate cards with a 1 July start date, and you check them before then.
- [x] **Cleaners' long service leave.** Decided and built 14/11/2026: NSW's contract cleaning scheme's levy, 1% of cleaners' ordinary wages, is an on-cost on commercial and builders cleaners (Admin → Catalogues → Work types, "Long service levy %"), left off overtime like super. Register the business and cleaners with the Long Service Corporation before cleaners start (January), and check the current rate then.
- [ ] **Restoration and the cleaning scheme.** Does NSW's contract cleaning long service scheme also cover restoration labourers and technicians, who are paid under the cleaning award? **Recommendation:** ask the Long Service Corporation when you register; if it does, I'll set their levy to 1% too.
- [ ] **Building workers' long service leave.** NSW's building and construction scheme covers labour hire workers doing building work. The employer registers and records their days, but pays no levy (whoever orders building work of $250,000 or more pays 0.25%). **Recommendation:** register before general labourers work on building sites.

## 5. The documents and the law

Without a lawyer, I check each draft against the official guidance and fix what I find; you read and approve it; then we take "draft" off. The biggest risk is the business agreement: it's a standard form contract with small businesses, and since November 2023 unfair terms in those carry penalties, so I'll check every clause against the ACCC's guide.

- [x] **Privacy policy and the collection notice.** Approved 14/11/2026: the privacy page (www.shifta.com.au/privacy, no longer marked draft) and the collection notice (version 1.0), checked against the OAIC's Australian Privacy Principles, including the decisions the app makes, which privacy policies must explain from 10 December 2026. We hold ID and visa details, so we follow the Privacy Act's principles even if our size would exempt us. Once the company is registered, its name and ABN go in.
- [x] **What we keep about workers.** Decided 14/11/2026: keep the rule. We delete ID photos, selfies, citizenship evidence and police certificates once checked, keeping the outcome, date and reference, and keep ticket documents and the record of each visa check.
- [x] **Casual employment contract.** Approved 14/11/2026 as version 1.0, checked against Fair Work's rules as they stand: casual means no firm advance commitment to ongoing work and a casual loading; after 6 months (12 while we have fewer than 15 employees) a casual can ask to become permanent, and we reply in writing within 21 days; pay at least the award, super on payday, minimum hours, visa limits, safety and "same job, same pay" orders. It's conditional on our checks passing. Once the company is registered, its name and ABN go in.
- [x] **The Fair Work Information Statement and Casual Employment Information Statement.** Decided and built 14/11/2026: workers read them in the app's paperwork step, which then emails them links to both on the Fair Work website, so they keep a copy.
- [x] **Our duties to casuals.** Done 14/11/2026: the contract explains the right to ask to become permanent, and the app emails each worker the Casual Employment Information Statement again at 6 months, 12 months and every year after, recording each one. **The law:** an employer with 15 or more employees gives it at those dates; a smaller one only at 12 months. When a worker asks to become permanent, our team talks with them and replies in writing within 21 days (Fair Work has template letters).
- [ ] **Information for workers supplied in South Australia.** Only if we open in SA.
- [x] **Labour hire services agreement.** Approved 14/11/2026 as version 1.0, the wording of draft 0.4 without the draft label: it's the version businesses accept (on the demo it took over from the draft). Each clause was checked against the law's examples of unfair terms (Australian Consumer Law, section 25) and summaries of the ACCC's guide (its website is blocked from the build environment). Still to do: once the company is registered, its name and ABN go at the top (version 1.1, before launch). What it says:
  - **Hiring our workers directly:** no placement fee (decided 14/11/2026, replacing the 15% fee in drafts 0.2 and 0.3), as the website says.
  - **Payment terms:** 7 days. A large business can have 14, set on the business in Admin → Businesses.
  - **Late payments:** interest at 4% a year above the Reserve Bank's cash rate (the rate NSW courts use on debts before judgment), and the reasonable cost of collecting; neither on an amount disputed in good faith.
  - **Late cancellations:** keep the 3 hours charged for each booking cancelled late, which the worker is paid.
  - **Vehicles and forklifts:** our workers drive them only if the business asks in writing and its insurance covers them.
  - **Supervision:** the business directs and supervises the work, and is responsible for damage, losses, and cash or valuables it gives our workers to handle.
  - **Rate changes:** rates can change with 30 days' notice, such as each 1 July when awards change, and the business can end the agreement instead (so the term is fair).
  - **Checks on request:** police checks, driving records or drug tests when a business asks, at its cost.
- [x] **The website and the direct-hire fee.** Decided 14/11/2026: no placement fee. The website keeps saying so, and draft 0.4 of the agreement says businesses can hire our workers directly for free.
- [x] **Texts and emails.** Decided 14/11/2026: no marketing messages unless people opt in, with an unsubscribe link. Our messages are about sign-in, bookings, hours and pay, which workers and businesses asked for; each says it's from Shifta, and workers can turn them off.
- [x] **The trade mark "Shifta".** Decided 14/11/2026: later, when funds allow (likely classes 35, 9 and 42, a few hundred dollars each with IP Australia). Search IP Australia's register now, which is free.
- [ ] **Labour hire licences.** NSW has no licence scheme yet, though the government has promised one; we'll update its settings if it passes. QLD, VIC, SA and the ACT need a licence before we open there. Only when opening another state.

## 6. How Shifta works

Until you decide, Shifta uses the default shown, and each can change later.

- [x] **Payment terms for businesses.** Decided and built 14/11/2026: 7 days (Admin → Settings → Pay and billing, and the agreement). A large business can have 14, set on the business in Admin → Businesses.
- [x] **Weekly run day.** Decided and built 14/11/2026: Wednesday, so weekend shifts approved within the 48 hours are paid and invoiced with the rest of their week.
- [x] **Texts for bookings and reminders.** Decided 14/11/2026: keep them. Workers with the app get app notifications; workers without it get texts, a few cents each.
- [x] **Late cancellations.** Decided and built 14/11/2026: a worker who hadn't arrived is paid the 3 hours the business is charged for cancelling late. A worker who has arrived is always paid at least the minimum engagement.
- [x] **Early starts and late finishes.** Decided 14/11/2026: keep the rule. Paid time starts at the rostered start even if a worker clocks in early, and a late finish is paid as clocked unless the business changes it.
- [x] **Changing a posted job.** Decided 14/11/2026: later. For now a business cancels and posts again; later, allow changes that don't change the pay, times or place (instructions, who to report to), and tell booked workers.
- [x] **Invoice extras.** Decided and built 04/11/2026: a row for each rate (hours, rate and amount), the job number and the business's PO or reference number (on the last posting step, or on the job page at any time), the site, and the award and level on each line. Still to come: separate invoices for each branch, before the first business with several branches signs up.
- [x] **Restoration:** decided and built 04/11/2026: "Restoration labourer" is back at the cleaning award's level 1 for labouring like strip-outs and pack-outs, and restoration technicians stay at level 2 for certified work. Both need a White Card, and a job asks for IICRC tickets when it needs them.
- [x] **How quickly we check new workers.** Decided 14/11/2026: keep "usually within two business days", which means checking new workers most weekdays.
- [ ] **Contact phone number** for the website and messages. **Recommendation:** a mobile you can answer, or email only at launch.
- [ ] **Support email:** set up forwarding for support@shifta.com.au to your own inbox; most domain sellers offer it free.
- [ ] **Photos of people for the home page:** allow the photo library in this environment, or send photos you have the rights to.
- [x] **Public or private code.** Decided 14/11/2026: public for now. Nothing secret is in it, and a private one would soon pay for its test runs.
- [x] **App Store and Google Play apps.** Decided 08/11/2026: yes, around launch, by wrapping the existing app with the phone's own notifications, location and camera. They follow the company (both stores ask a business for a free D-U-N-S number), so the steps are in January's list in `PROGRESS.md`. US$99 a year for Apple and US$25 once for Google.
- [x] **The 10 questions in `docs/plan.md`.** Decided 14/11/2026: keep our recommendations.

### Later (not needed to launch)

- [ ] **The next state after NSW.** It needs workers' compensation cover there (each state has its own scheme, like WorkSafe in Victoria), and a labour hire licence in QLD, VIC, SA and the ACT. Then you open it in Admin → States and licences, once its public holidays and tickets are in Admin.
- [ ] **Other states' public holidays:** allow the state government websites (like vic.gov.au, qld.gov.au and wa.gov.au) in the cloud environment's network settings, and I'll load them; or your team enters them in Admin from each state's official list.
- [ ] **Industries that need a licence:** security, aged care, disability support (NDIS), childcare and licensed trades are left out, as the business would need its own licence or registration first. Add any?
- [ ] **shifta.au:** buy it too, so nobody else can.
