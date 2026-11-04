# Questions to settle before launch

_Last updated: 04/11/2026_

Everything we still need to settle before real shifts. There's no paid accountant, lawyer, insurance broker or payroll professional (owner, 04/11/2026): you make every decision, and we work each one out together. For each question I research the official sources and give a recommendation; you decide, or check it with the free government services below first. When you decide, tell me in chat: I'll tick it off here with the date, note the decision in `PROGRESS.md`, and make any change it needs.

Some answers are set by law rather than by choice: workers' compensation insurance before anyone works, paying at least the award, and registering for PAYG withholding before the first pay run. Those are marked **The law**.

Never put keys, passwords or the margin in chat or in this file. The margin goes straight into Admin → Settings → Pay and billing, because the code is public.

For Claude, each session: read this file at the start. Tick decided questions (`[x]`, with the date and the decision), record decisions in `PROGRESS.md`, add new questions here as they come up, and research each from official sources before recommending. Some NSW government sites are blocked from the build environment (nsw.gov.au, longservice.nsw.gov.au); say so when a recommendation rests on search summaries rather than the official page.

## Free help

These cost nothing, and their answers carry more weight than mine:

- **Fair Work Ombudsman small business helpline, 13 13 94:** pay, awards and casual employment.
- **Fair Work's Employer Advisory Service:** free written advice on award pay and entitlements for businesses with fewer than 15 employees. If you follow its advice in good faith and it turns out to be wrong, Fair Work won't seek penalties (you still pay what's owed). Use it for the award questions in section 4 while we're small; I'll write the enquiry for you to send.
- **icare:** NSW workers' compensation, quotes and how our workers are classified.
- **The Long Service Corporation:** NSW's portable long service leave schemes for cleaning and for building and construction.
- **The ATO and Revenue NSW:** registrations, GST, BAS and payroll tax.
- **The OAIC** (privacy) and **the ACCC** (unfair contract terms): guides we check our documents against.

## 1. The business and tax

- [ ] **Company or sole trader?** Please tell me which, with the legal name and ABN, and whether it's registered for GST and PAYG withholding. Invoices and the payroll app need them. **Recommendation:** a company (Pty Ltd). Labour hire carries risks, like injuries and damage at a business's site, that could otherwise fall on you personally; it costs a few hundred dollars to register with ASIC, plus a yearly fee. Insurance is the main protection either way.
- [ ] **GST.** You must register once turnover reaches $75,000 a year, and one full-time worker billed for a year passes that. **Recommendation:** register now (free, with the ATO), and report GST on a cash basis, when businesses pay you, which any business turning over less than $10 million can choose. Shifta's Sales and GST page shows sales both ways.
- [ ] **PAYG withholding.** **The law:** register before the first pay run (free). The payroll app works out each worker's tax and reports it to the ATO every payday; you pay it with your BAS, quarterly while you withhold $25,000 a year or less.
- [ ] **The BAS.** You can lodge it yourself, free, in the ATO's Online services for business: GST on sales from Shifta's Sales and GST page, GST on your own costs from receipts and bank statements, and tax withheld from the payroll app. **Recommendation:** quarterly, the default for small businesses.
- [ ] **Payroll tax.** NSW charges 5.45%, but only on wages above $1.2 million a year (2026–27, unchanged). **Recommendation:** set the payroll tax on-cost to 0% for now (it's 5.45% as a placeholder), so prices aren't higher than they need to be, and I'll add a warning to the admin dashboard as wages near $100,000 a month.
- [ ] **The company's tax return** (later: the first is for the year to 30 June 2027). It can't be lodged in the ATO's online services: it's a paper return, tax software, or a tax agent. Not needed to launch.
- [ ] **Bank account and cash.** A business bank account, and cash for 2–3 weeks of wages: workers are paid weekly, and businesses pay after their invoice is due (see payment terms, section 6).
- [ ] **The margin.** **Recommendation:** we work it out from your yearly costs (insurance, the payroll app, texts and email, hosting, unpaid invoices) and what you want to earn. I'll list the costs once the quotes are in; you type the result into Admin.
- [ ] **The name "Shifta".** If the company's legal name is different, register "Shifta" as a business name with ASIC (a small fee). Texts come from the sender name "Shifta", which Twilio registers against your ABN on the national Sender ID Register, and invoices show the legal name.

## 2. Insurance

- [ ] **Workers' compensation.** **The law:** in NSW you need it before anyone works. Buy it straight from icare online; there's no need for a broker. The premium is wages times the rate for your industry: about 1.8% across all NSW industries, usually higher for building, warehouse and removal work. **Recommendation:** get icare's quote describing us as labour hire supplying labourers, cleaners, restoration, warehouse and removalist workers to other businesses, and ask how on-hired workers are classified (whether by the business they go to). Then I'll show you where each work type's rate goes (Admin → Catalogues → Work types); it's a 5% placeholder until then.
- [ ] **Public liability.** Not required by law for everyone, but businesses, building sites especially, ask for $20 million cover and a certificate of currency before workers arrive. For $20 million, small businesses pay roughly $750–$1,800 a year at low risk and $2,400–$5,000 or more at higher risk; labour hire sits at the higher end. **Recommendation:** get two or three quotes online for "labour hire" with $20 million cover, and check the policy covers our workers at other businesses' sites. Its cost goes into the insurance on-cost.
- [ ] **Anything else** (professional indemnity, cyber, vehicles and equipment). **Recommendation:** not at launch. The business agreement should say the business insures its own vehicles, forklifts and tools (section 5).

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
- [ ] **General labourers' fares and travel allowance.** Shifta pays it on every shift; the award says each day worked. **Recommendation:** pay it once a day when a worker has two shifts in a day (a small change), and include it in the enquiry.
- [ ] **Furniture carter allowance.** Does the road transport award's weekly allowance ($27.39 a week) apply to removalist offsiders? **Recommendation:** include it in the enquiry; if it applies, I'll add weekly allowances.
- [ ] **The warehouse award.** Send me the Storage Services and Wholesale Award pay guide from the Fair Work website; I'll prepare the rate cards and you check them against the pay guide. Pick-packers, storepersons and forklift drivers can't be booked until then.
- [ ] **Super.** **The law:** 12% of ordinary pay since 1 July 2025; that's the setting.
- [ ] **Each 1 July.** Award rates change every year from 1 July. **Recommendation:** each June, you send me the new pay guides, I prepare the new rate cards with a 1 July start date, and you check them before then.
- [ ] **Cleaners' long service leave.** NSW's contract cleaning scheme: employers register their business and cleaners, lodge returns and pay a levy of 1% of cleaners' ordinary wages (check the current rate when registering). **Recommendation:** register before cleaners start, and I'll add 1% to cleaners' on-costs (a small change). Ask the Long Service Corporation whether it also covers restoration technicians, who are paid under the cleaning award.
- [ ] **Building workers' long service leave.** NSW's building and construction scheme covers labour hire workers doing building work. The employer registers and records their days, but pays no levy (whoever orders building work of $250,000 or more pays 0.25%). **Recommendation:** register before general labourers work on building sites.

## 5. The documents and the law

Without a lawyer, I check each draft against the official guidance and fix what I find; you read and approve it; then we take "draft" off. The biggest risk is the business agreement: it's a standard form contract with small businesses, and since November 2023 unfair terms in those carry penalties, so I'll check every clause against the ACCC's guide.

- [ ] **Privacy policy and the collection notice** workers see when they sign up, checked against the OAIC's guide. We hold ID and visa details, so we follow the Privacy Act's principles even if our size would exempt us.
- [ ] **What we keep about workers.** We delete ID photos, selfies, citizenship evidence and police certificates once checked, keeping the outcome, date and reference, and keep ticket documents and the record of each visa check. **Recommendation:** keep this rule; it holds the least we need.
- [ ] **Casual employment contract,** checked against Fair Work's templates and the awards. Workers sign it before we've checked them, so it's worded as conditional on our checks passing.
- [ ] **The Fair Work Information Statement and Casual Employment Information Statement.** Workers read them in the app's paperwork step. **Recommendation:** also email each new worker a copy, so they keep one.
- [ ] **Our duties to casuals,** like their right to ask to become permanent after a time. I'll check the app and contract against Fair Work's guide.
- [ ] **Information for workers supplied in South Australia.** Only if we open in SA.
- [ ] **Labour hire services agreement** (draft 0.2, waiting unpublished in Admin → Agreements). My recommendations, for you to approve:
  - **Hiring our workers directly:** keep 15% of the first year's pay, plus GST, within 180 days of their last shift through us. It's common in labour hire; I'll check it reads fairly.
  - **Payment terms:** 7 days rather than 14, as workers are paid weekly; it shortens how long you're out of pocket. Add interest on late payments at a modest stated rate, and the reasonable cost of collecting.
  - **Late cancellations:** keep the 3 hours charged for each booking cancelled late.
  - **Vehicles and forklifts:** our workers drive them only if the business asks in writing and its insurance covers them.
  - **Supervision:** the business directs and supervises the work, and is responsible for damage, losses, and cash or valuables it gives our workers to handle.
  - **Rate changes:** rates can change with 30 days' notice, such as each 1 July when awards change, and the business can end the agreement instead (so the term is fair).
  - **Checks on request:** police checks, driving records or drug tests when a business asks, at its cost.
- [ ] **Texts and emails.** Our messages are about sign-in, bookings, hours and pay, which workers and businesses asked for, each says it's from Shifta, and workers can turn them off. **Recommendation:** no marketing messages unless people opt in, with an unsubscribe link.
- [ ] **The trade mark "Shifta"** (likely classes 35, 9 and 42, a few hundred dollars each with IP Australia). **Recommendation:** later, when funds allow; search IP Australia's register now, which is free.
- [ ] **Labour hire licences.** NSW has no licence scheme yet, though the government has promised one; we'll update its settings if it passes. QLD, VIC, SA and the ACT need a licence before we open there. Only when opening another state.

## 6. How Shifta works

Until you decide, Shifta uses the default shown, and each can change later.

- [ ] **Payment terms for businesses:** 14 days now. **Recommendation:** 7 days (section 5), in Admin → Settings → Pay and billing and in the agreement.
- [ ] **Weekly run day:** Monday now. Businesses have 48 hours to approve hours, so weekend shifts often miss Monday's run and are paid a week later. **Recommendation:** Wednesday, so every shift of the week is paid and invoiced together.
- [ ] **Texts for bookings and reminders:** workers with the app get them as app notifications; workers without it get texts, a few cents each. **Recommendation:** keep the texts; a missed shift costs more.
- [ ] **Late cancellations:** should a worker who hadn't arrived yet be paid the 3 hours the business is charged? Not now; a worker who has arrived is always paid at least the minimum engagement. **Recommendation:** yes: the business pays for it, and workers who lose a shift late will stay with us.
- [ ] **Early starts and late finishes:** paid time starts at the rostered start even if a worker clocks in early, and a late finish is paid as clocked unless the business changes it. **Recommendation:** keep this rule.
- [ ] **Changing a posted job:** a business can only cancel and post again now, because workers decide on what they were shown. **Recommendation:** later, allow changes that don't change the pay, times or place (instructions, who to report to), and tell booked workers.
- [ ] **Invoice extras.** **Recommendation:** a PO or reference number on jobs and invoices now, as some businesses won't pay without one; the award and level on invoice lines, and separate invoices for each branch, only when a business asks.
- [ ] **Restoration:** every restoration job needs a White Card, and an IICRC ticket only when the business ticks it; restoration labouring is charged at the technician rate. **Recommendation:** keep both for now.
- [ ] **How quickly we check new workers:** the app says "usually within two business days". **Recommendation:** keep it if you can check workers most weekdays; otherwise "within three business days".
- [ ] **Contact phone number** for the website and messages. **Recommendation:** a mobile you can answer, or email only at launch.
- [ ] **Support email:** set up forwarding for support@shifta.com.au to your own inbox; most domain sellers offer it free.
- [ ] **Photos of people for the home page:** allow the photo library in this environment, or send photos you have the rights to.
- [ ] **Public or private code:** the GitHub repository is public. Nothing secret is in it, and a private one would soon pay for its test runs. **Recommendation:** keep it public for now.
- [ ] **The 10 questions in `docs/plan.md`:** Shifta uses our recommendations. **Recommendation:** keep them.

### Later (not needed to launch)

- [ ] **The next state after NSW.** It needs workers' compensation cover there (each state has its own scheme, like WorkSafe in Victoria), and a labour hire licence in QLD, VIC, SA and the ACT. Then you open it in Admin → States and licences, once its public holidays and tickets are in Admin.
- [ ] **Other states' public holidays:** allow the state government websites (like vic.gov.au, qld.gov.au and wa.gov.au) in the cloud environment's network settings, and I'll load them; or your team enters them in Admin from each state's official list.
- [ ] **Industries that need a licence:** security, aged care, disability support (NDIS), childcare and licensed trades are left out, as the business would need its own licence or registration first. Add any?
- [ ] **shifta.au:** buy it too, so nobody else can.
