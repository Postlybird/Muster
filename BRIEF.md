# Muster — Build Brief

> **Owner update, 30/10/2026.** The business is now **Shifta** (shifta.com.au), with the slogan "Staff today, not someday." It takes work in **every industry** from now on, not just restoration and cleaning: industries group the work types and are managed in Admin like the other catalogues. Where this brief says the market is restoration and cleaning, read "every industry". Work that needs a licence the business doesn't hold yet (security, aged care and disability support, childcare, licensed trades) is left out until the owner decides.
>
> **Owner update, 30/10/2026 (later).** Shifta is **Australia-wide**, not just Sydney. Where this brief says Sydney or Greater Sydney, read "Australia-wide, state by state": every state and territory is in the platform, and admins open each one for work (NSW first) once we have workers' compensation cover there and any labour hire licence the state requires (today QLD, VIC, SA and the ACT). Where it says to display times in Australia/Sydney, a shift's times show in its site's own time zone.
>
> **Owner update, 31/10/2026.** Workers can stand out, and call-outs are faster (changes to §4.3 and §4.4):
> - **What businesses see of a worker** goes beyond §4.4: a profile with the worker's bio, their stars with how many ratings, the tags businesses gave, badges, their experience and level in each type of work, the checks we've done and their history with that business. Never documents, date of birth, visa or contact details.
> - **Applying can carry a note** ("why I'm a good fit", up to 300 characters). Notes and bios can't hold phone numbers, emails or links.
> - **Call-outs** pay 20% more per hour and go out by text and app notification at any hour, to workers who opted in. If nobody accepts within 20 minutes, the business and our team are told. Open work starting within 48 hours can be turned into a call-out, say after a worker cancels.

*"Muster" is a working name only. Keep the brand in a single config value (`src/config/brand.ts`) so swapping in the real name is a one-line change.*

On-demand labour hire for property services and trades. Businesses request workers for shifts; vetted workers pick up shifts from their phones. **We are the labour hire provider**: workers are our casual employees, we pay them through a payroll provider, and businesses (hosts) pay us a bill rate that includes our margin.

**Launch market:** Sydney, restoration and cleaning.
**Expansion:** adjacent trades first (trades assistants, strip-out and demolition labour, make-safe labourers, contents and pack-out crews, removalist offsiders), then other cities. Nothing is hard-coded to restoration: categories, tickets, hazards, PPE and rates are all admin-managed data.

---

## 1. How to work on this project

- Read this whole file at the start of every session, then `PROGRESS.md`. Create a short `CLAUDE.md` in the project root that tells future sessions to do the same.
- Keep `PROGRESS.md` current: done, next, decisions made, open questions.
- Work in the phases in section 11. Before each phase, propose the plan (schema, pages, components, third-party services) and wait for approval.
- Ask before adding a paid service, storing a new kind of personal data, or departing from this brief.
- Every external service sits behind an adapter with a mock or manual implementation, so the whole app runs end to end with no paid accounts.
- When the owner has to do something (create an account, add a key, set up a domain), stop and give numbered, plain-English steps.
- Never commit secrets. Keys live in `.env.local`; keep `.env.example` current.
- Seed script with realistic demo data: Sydney suburbs, a few restoration and cleaning businesses, about 30 workers with a mix of verified, pending and soon-to-expire tickets.
- Tests: unit tests for eligibility, pay and bill calculations, and expiry logic; Playwright tests for the core flows in section 4.
- Australian English and formats: dd/mm/yyyy, AUD, +61 phone numbers. Store times in UTC, display in Australia/Sydney.

## 2. Design principles — simple beats everything

- A worker goes from the landing page to "submitted for verification" in under 5 minutes on a phone.
- A business posts a shift in under 60 seconds (saved sites, templates, "repeat last shift").
- Mobile-first for workers; comfortable on desktop for businesses and admin.
- One main action per screen, plain words, large tap targets, and a visible "what happens next" on every status.
- Uncluttered dashboards. Fewer features, done properly.
- Accessible to WCAG 2.1 AA (contrast, labels, keyboard use).

## 3. Who uses it

| Role | What they do |
|---|---|
| Worker | Signs up, gets verified, sets availability, takes shifts, clocks in and out, gets rated |
| Business owner | Company details, billing, sites, team, agreement |
| Business manager | Posts work, picks workers, approves timesheets |
| Site supervisor | Confirms arrivals; adjusts and approves timesheets for their sites |
| Platform admin (us) | Verifies workers and businesses, manages catalogues and rates, runs pay and billing, handles disputes |

Only approved businesses can post work. Individuals and households can't post in v1.

## 4. Core flows

### 4.1 Worker onboarding

A step-by-step wizard the worker can leave and resume at any point.

1. **Sign up** with a mobile number (SMS code) or email magic link. No passwords.
2. **Profile:** legal and preferred name, date of birth (18+ in v1), suburb, travel radius, transport (car, licence class, public transport), and a clear face photo so supervisors know who's arriving.
3. **Right to work:** Australian citizens upload proof of citizenship (Australian passport, or birth or citizenship certificate), because VEVO can't confirm citizenship. Everyone else (including permanent residents and New Zealand citizens) enters visa and passport details and gives consent for a VEVO check. Record the result, visa expiry and conditions, and schedule re-checks: at visa expiry, and every 3 months for a bridging visa with no expiry date.
4. **Identity:** photo ID (driver licence or passport) plus a selfie. Manual review in v1.
5. **Work types:** the categories they want, years of experience, a short bio.
6. **Tickets:** pick from the catalogue, upload a photo or PDF, enter number and expiry date.
7. **Police check:** upload an existing National Police Check now; ordering one in the app comes in Phase 2. Only required where the category or host requires it. The maximum accepted age of a check is a setting.
8. **Availability:** weekly pattern, an "available now" switch, and blocked-out dates.
9. **Employment paperwork** (we're the employer): casual employment contract, Fair Work Information Statement and Casual Employment Information Statement, each acknowledged and stored. Tax file number, super choice and bank details are collected by the payroll provider's own onboarding and never stored in our database; we store only the payroll employee ID and onboarding status.
10. **Submitted:** a checklist shows what's verified, pending or rejected (with the reason and how to fix it). Once admin verifies the core items, the worker becomes Active and sees shifts in categories whose required tickets are verified.

### 4.2 Business onboarding

1. Sign up with email (magic link or password).
2. Enter the ABN. Look it up live via ABN Lookup and pre-fill legal name, entity type, ABN status and GST registration. Block cancelled ABNs.
3. Billing contact and accounts email.
4. Sites: address (autocomplete, geocoded), access and parking notes, default report-to person.
5. Invite managers and supervisors.
6. Accept the Labour Hire Services Agreement (versioned; record who, when and IP address).
7. Admin approves the business (manual in v1, with an "approved for account terms" flag).

### 4.3 Posting work

- **Types:** single shift; multi-day (e.g. Mon–Fri for two weeks); urgent call-out (ASAP, higher rate, sent to every eligible worker nearby).
- **Details:** site, category, number of workers, dates and times, unpaid break, required tickets (pre-filled from the category, editable), police check yes/no, instructions and photos, report-to name and phone.
- **Site hazards** (checklist plus notes): suspected or confirmed asbestos, mould, Category 3 water/sewage, fire and smoke residue, biohazards and sharps, heights, confined spaces, live electrical, structural damage, heavy manual handling. Plus the controls in place and induction details.
- **PPE required** (checklist) and who supplies it.
- As labour hire provider we carry work health and safety duties for every placement, so a job can't be posted until the hazard section is completed ("no known hazards" is a valid answer). Workers see hazards and PPE before they accept.
- **Cost estimate** before posting: hours × bill rate, with overtime, weekend and public holiday rates applied, plus GST.
- Templates, "repeat last shift", and "offer to my favourites first for X minutes".

### 4.4 Filling work

**Eligibility (hard rules)** — checked when a job is posted, when a worker accepts, and again 24 hours before start:

- Worker is Active and not blocked by this business.
- Every required ticket is verified and valid on the shift date.
- Right to work is valid on the shift date. Visa conditions such as work-hour limits are flagged for admin (no automatic calculation in v1).
- Within the worker's travel radius, available, and not booked on an overlapping shift.
- Police check on file if required.

**Ranking:** this business's favourites, past shifts with this business, rating, reliability, distance, experience in the category.

**Fill modes** (set per job):

- *Pick:* the business chooses from applicants, seeing photo, preferred name, rating, reliability, verified ticket names and shifts completed. Never documents, date of birth or visa details.
- *Auto-fill:* the first eligible workers to accept are confirmed. Default for urgent call-outs.

**What workers see:** hourly pay, suburb, hazards, PPE and required tickets. The exact address and report-to details appear once confirmed. Reminders go out 24 hours and 2 hours before, with a calendar file.

### 4.5 Cancellations and no-shows

- Worker cancellations inside a set window (e.g. 12 hours) and no-shows lower the reliability score. Two no-shows within 30 days suspends the worker pending admin review. All thresholds are settings.
- Business cancellations inside a set window are charged per policy. If a worker has already arrived, they're paid at least the minimum engagement set for that category.
- When a confirmed worker drops out, the shift is re-offered automatically and the business is told.

### 4.6 On the day

- Clock in and out on the phone with a GPS check against the site (radius is a setting). Clocking in outside the radius is allowed with a reason and gets flagged.
- Clock-in works with poor signal: queue it and sync later.
- A **"Report a safety issue"** button on the live shift screen alerts admin immediately.
- Supervisors can confirm arrival, adjust times and record breaks.
- A timesheet is created at clock-out. The business approves or disputes it within 48 hours (a setting); after that it auto-approves with a notification. Disputes go to the admin queue with both sides' notes.

### 4.7 Ratings and reliability

- After approval, the business rates the worker (1–5 with tags like punctual, hard-working, would rehire; add to favourites or block) and the worker rates the site (1–5 with tags like safe site, well organised, clear instructions).
- Averages are visible; written comments go privately to admin.
- Reliability is separate from rating: completed shifts versus late cancellations and no-shows, plus punctuality.

### 4.8 Pay and billing

- **Pay rates** come from admin-managed rate cards: category × level × day type (ordinary, overtime, Saturday, Sunday, public holiday, night), as a base rate plus multipliers, casual loading included. Don't hand-code award rules: rate cards are set by admin and checked by a payroll professional, and the payroll provider does the final award interpretation.
- **Host overrides:** a business can have its own pay rate card, for example where the Fair Work Commission has made a regulated labour hire arrangement ("same job, same pay") order covering that host.
- **Bill rates:** pay rate plus on-costs (super, workers compensation, payroll tax, insurance — each a percentage in settings) plus margin; or a fixed bill rate per category per business.
- Snapshot pay rate, bill rate and margin on every assignment so later rate changes never rewrite history.
- **Weekly run** (day is a setting): the prior week's approved timesheets produce (a) a payroll export and (b) one invoice per business, with a line per worker per shift, GST, and a PDF emailed to the accounts contact.
- v1: CSV payroll export matching the payroll provider's timesheet import, plus PDF invoices on account terms. Phase 2: push approved timesheets through the Employment Hero Payroll API, and take payment with Stripe (card and BECS direct debit).

### 4.9 Compliance

- **Expiry engine** (nightly): warn workers at 30, 14 and 7 days; on expiry mark the ticket expired and remove eligibility; alert the worker and admin about any confirmed shift that now fails the rules.
- **VEVO re-checks** on the schedule in 4.1.
- **Labour hire licensing:** QLD, VIC, SA and the ACT already license labour hire providers, and the NSW Government has promised an all-industries scheme if re-elected, with penalties for hosts who use unlicensed providers. Store our licence number per state; block jobs in any state where a licence is required and we don't hold one; show the licence number on agreements and invoices where required; support per-state worker notices (SA requires an information notice to the worker each time they're supplied).
- **Audit log:** who viewed, changed or verified any worker document or personal record, and when.
- **Privacy:** ID, police check and visa details are sensitive. Private storage buckets, short-lived signed URLs, admin-only access, consent captured before any check, and a privacy policy and collection notice at sign-up. After verification, delete ID images and keep the outcome, date and reference. Host all data in Australia (Supabase Sydney region).
- **Record keeping:** keep employment records (timesheets, hours, pay rates) for 7 years. Archive, never hard-delete.

## 5. Notifications

- Channels: web push (installed app), SMS (login codes and urgent work), email (summaries, invoices).
- Per-user preferences, except critical messages.
- Templates editable by admin.
- Quiet hours for non-urgent messages (9pm–6am, a setting). Urgent call-outs reach only workers who opted in to them.

## 6. Admin console

- **Verification queue:** document viewer beside the entered details; approve or reject with reason templates.
- **Workers and businesses** with filters (category, ticket, suburb, status, expiring soon).
- **Shift board:** open, filled, in progress. Shifts starting within 24 hours that aren't fully filled show red.
- **Catalogues and settings:** categories, tickets, hazards, PPE, rate cards, policies (cancellation windows, geofence radius, auto-approve window, police check age), agreement versions, our licences.
- **Disputes, no-shows, safety reports and suspensions.**
- **Weekly pay and billing run** with exports.
- **Reports:** fill rate, time to fill, no-show rate, active workers, hours by category, revenue and gross margin by business and category.

## 7. Pages

- **Public:** landing page with two clear paths ("Find work" / "Hire workers"), how it works for each, FAQ, privacy, terms, contact.
- **Worker:** onboarding wizard; home (next shift, offers, verification checklist); find shifts; shift detail; my shifts; clock in/out; timesheets; profile and tickets; availability; notifications; settings.
- **Business:** onboarding; dashboard (today's shifts, fill status, timesheets to approve); post-work wizard; job detail (applicants, confirmed workers, live attendance); timesheets (bulk approve); workers (favourites, history); sites; team; invoices; settings.
- **Admin:** everything in section 6.

## 8. Tech stack

- Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui. Code on GitHub, deployed on Vercel.
- Supabase: Postgres in the Sydney region, Auth (SMS code and email magic link), Storage (private buckets), Row Level Security on every table.
- Scheduled jobs (expiry checks, reminders, auto-approvals, weekly run) via Vercel Cron or Supabase pg_cron.
- PWA: installable, web push (works on iPhone once added to the home screen), offline-tolerant clock-in.
- Zod, react-hook-form, date-fns-tz, @react-pdf/renderer for invoices, Vitest and Playwright.

### Adapters

| Adapter | v1 | Later |
|---|---|---|
| ABN | ABN Lookup web services, live. Free GUID from abr.business.gov.au. The JSON endpoint returns JSONP, so call it server-side and unwrap. | — |
| Email | Resend | — |
| SMS | Twilio | — |
| Maps and geocoding | Google Maps Places | Mapbox |
| Identity | Manual review | Stripe Identity, or a DVS driver licence check provider |
| Police check | Upload and manual review | ACIC-accredited provider with an API, e.g. National Crime Check or Worker Checks |
| Right to work | Manual VEVO check in ImmiAccount, result recorded | VEVO via Worker Checks, CVCheck or Employment Hero |
| Payroll | CSV export | Employment Hero Payroll API |
| Payments | Invoices on account terms | Stripe (card, BECS direct debit) |

### Access rules (Row Level Security)

- Workers see their own records and the open shifts they're eligible for.
- Business users see their own business's jobs, sites and team, plus the limited worker view in 4.4. Contact details are shared only after confirmation.
- Admins see everything; every admin view of a sensitive record is logged.

## 9. Data model

A starting point; propose refinements before building. Every table has a UUID id and created/updated timestamps; archive rather than delete.

- **profiles**: user, role (worker / business_user / admin), name, phone, email
- **workers**: profile, legal and preferred names, date of birth, photo, home location, travel radius, transport, status (draft / pending / active / suspended / offboarded), rating average, reliability score, payroll employee ID, onboarding step statuses
- **work_rights**: worker, citizen or visa, visa subclass, expiry, conditions, VEVO checked at, result, next check due, checked by
- **credential_types**: the ticket catalogue — name, has number, has expiry, needs document, verification method
- **worker_credentials**: worker, type, number, issued, expires, document path, status (pending / verified / rejected / expired), verified by and when, rejection reason
- **categories**: name, required credential types, police check required, minimum engagement hours, default PPE, active
- **worker_categories**: worker, category, years of experience
- **availability**: worker, weekly pattern, available-now-until, blocked dates
- **businesses**: ABN, legal and trading names, entity type, GST registered, ABN status, ABR checked at, status, billing email, account terms approved, Stripe customer ID
- **business_users**: business, profile, role (owner / manager / supervisor), site access
- **sites**: business, name, address, latitude/longitude, geofence radius, access notes, default report-to
- **agreements**, **agreement_acceptances**: versioned documents; who accepted, when, IP address
- **jobs**: business, site, category, type (shift / multi-day / urgent), description, headcount, required credentials, police check required, hazards, controls, PPE, report-to, fill mode (pick / auto), status
- **shifts**: job, start, end, unpaid break, headcount
- **applications**: shift, worker, status (applied / offered / confirmed / declined / withdrawn / cancelled by worker / cancelled by business / no-show)
- **assignments**: shift, worker, pay rate, bill rate and margin snapshots, status
- **attendance**: assignment, clock-in and clock-out times and locations, inside geofence, reason if outside
- **timesheets**: assignment, start, finish, break, hours by rate type, allowances, status (submitted / approved / auto-approved / disputed / adjusted), approved by and when, dispute notes
- **safety_reports**: assignment, reporter, description, photos, status
- **ratings**: assignment, rater, score, tags, private note
- **favourites**, **blocks**: business, worker
- **rate_cards**, **bill_rate_rules**: default or per business, category, level, day type, base rate, multiplier, on-costs, margin, effective from
- **pay_runs**, **pay_run_lines**: period, status, export file
- **invoices**, **invoice_lines**: business, period, number, subtotal, GST, total, status, PDF path, Stripe invoice ID
- **licences**: our labour hire licences by state, number, expiry
- **notifications**: user, channel, template, payload, sent at, read at
- **audit_log**: actor, action, record, before/after, time

## 10. Not in scope for now

- Individuals or households posting jobs.
- Workers engaged as ABN contractors.
- App Store and Play Store apps (the PWA covers phones).
- Calculating payroll ourselves.
- Permanent recruitment.

## 11. Phases

**Phase 0 — Foundations:** project setup, Supabase, auth, roles, layout and design system, brand config, seed script, CI (lint, type check, tests), Vercel preview deployments.

**Phase 1 — Run real shifts (MVP):** everything in sections 4–9 except the items listed under Phase 2.
*Done when* an admin can onboard 10 workers and 3 businesses, fill 20 shifts end to end, and produce the payroll export and invoices without editing the database by hand.

**Phase 2 — Automate:** Stripe payments, Employment Hero Payroll API, automated identity, police check and VEVO checks, in-app messaging per shift, recurring jobs, smarter ranking, fuller reports.

**Phase 3 — Scale:** licensing rules for other states, more cities, worker referrals, self-serve credit for businesses, rostering for a business's own staff.

## 12. Open decisions

Make these settings or placeholders; don't let them block the build.

- Final brand name.
- Margin, on-costs, cancellation and no-show rules, geofence radius, auto-approve window, maximum police check age, minimum worker age.
- Payroll provider (Employment Hero assumed).
- Our labour hire licences, and the timing of the NSW scheme.
- Legal review of the Labour Hire Services Agreement, casual employment contract, privacy policy and collection notice.

## Appendix — seed catalogues

**Categories:** Restoration labourer · Restoration technician · Contents and pack-out crew · Strip-out and demolition labourer · Mould remediation assistant · Commercial cleaner · Trades assistant · Removalist offsider

**Tickets:** White Card · IICRC WRT, ASD, AMRT, FSRT, OCT · Asbestos awareness · Working at heights · Confined space entry · First aid (HLTAID011) · Driver licence (C, MR, HR) · Forklift licence (LF) · National Police Check · Working with Children Check · Respirator fit test

**Hazards:** as listed in 4.3

**PPE:** P2 disposable respirator · half-face respirator (P2/P3 filters) · full-face respirator · disposable coveralls · nitrile gloves · cut-resistant gloves · steel-cap boots · gumboots · hi-vis · safety glasses or goggles · hearing protection · hard hat
