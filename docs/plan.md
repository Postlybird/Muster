# Phase 0 and Phase 1 plan

Approved by the owner on 28/10/2026. This is the reference for the build;
`PROGRESS.md` tracks where we are against it. Changes to this plan need the
owner's OK.

## Open questions from the brief

The owner asked us to use these recommendations unless they say otherwise.
All ten must be settled (answered or accepted) before Phase 1 starts. Status
is tracked in `PROGRESS.md`.

1. **Licensing timing.** §4.9 (Phase 1) blocks jobs in licensed states, but Phase 3 lists "licensing rules for other states". → Build the mechanism in Phase 1 (licences, which states require one, blocking, per-state worker notices) and load NSW data only.
2. **Deleting ID images vs. keeping documents.** → After verification, delete the ID photo, selfie, citizenship evidence and police certificate, keeping the outcome, date and reference. Keep ticket documents (hosts and insurers ask for them) and the VEVO result record (evidence that we checked). Confirm with a privacy adviser.
3. **Availability as a hard rule.** → The weekly pattern decides who is notified; a worker choosing to accept counts as available. Blocked dates and overlapping shifts still block.
4. **"Level" in rate cards is undefined.** → Each job has a level (default from the category); admin sets each worker's level per category; a worker is eligible if their level ≥ the job's. Seed Level 1 only.
5. **Overtime across hosts.** → v1 calculates daily overtime only (threshold in settings). Weekly overtime is left to Employment Hero's award interpretation; margin reports are labelled as estimates.
6. **Payroll export contents.** → Export raw start, finish and break per shift plus work type, site and allowances (e.g. the urgent loading). Our rate splits drive invoices, estimates and margin only. Need the owner's Employment Hero timesheet import template.
7. **Urgent call-out "higher rate".** → Both pay and bill, as two separate percentage settings (placeholders until set). The pay part goes into the export as an allowance.
8. **Late business cancellation before the worker arrives.** → Business is charged X hours (setting). The worker is paid only if they arrived, unless a setting says otherwise. Minimum engagement applies to every short shift, not only cancellations.
9. **Contract before verification; payroll onboarding.** → The contract is worded as conditional on verification (legal to confirm). Admin creates the worker in Employment Hero at verification; "payroll onboarding complete" is a core item before Active.
10. **Paid services the brief implies.**
    - Vercel Hobby is non-commercial only, and its cron runs once a day.
    - Supabase Free pauses after a week idle and has no backups.
    - Supabase's built-in email only reaches the project team, so real users need Resend plus a domain.
    - SMS login needs Twilio.

    → Build and preview on free tiers with mocks, and ask before each paid switch. Use Supabase pg_cron (free) for frequent jobs.

### Defaults adopted unless the owner objects

- **Pick mode:** applying is a commitment, and picking confirms instantly. "Offered" is reserved for direct offers (favourites first, re-offers) that the worker accepts.
- **Multi-day jobs:** "Accept all days" by default, with "choose days".
- **Posting rights:** in v1 a business needs both approval and account terms to post. Owners can do everything managers can.
- **Police checks and WWCC** are tickets in the catalogue. Police check validity is the issue date plus the max-age setting.
- **Driver licence:** the profile asks about a car and licence class. The Driver licence ticket is required and verified only where a job needs driving.
- **Rate types:**
  - "Night" means hours between two times set in settings.
  - Precedence: public holiday > Sunday > Saturday > overtime > night > ordinary.
  - Shifts that cross midnight or a daylight-saving change are split correctly.
  - NSW public holidays live in a table.
- **Rate cards:** the base rate excludes casual loading. Each day-type multiplier is the total including loading (e.g. 1.25 ordinary), and the UI shows the resulting dollar amounts.
- **On-costs and margin:** on-costs are global, with a per-category override for workers' comp. Margin is a percentage with per-category and per-business overrides, or a fixed bill rate per day type.
- **No-shows:** flagged when there is no clock-in 30 minutes after start. The supervisor confirms no-show or arrival, otherwise admin decides. Suspension stops new shifts; admin decides whether to keep or re-offer existing ones.
- **Reliability:** last 20 shifts, weights in settings. New workers show "New".
- **Contact details after confirmation:** the business sees the worker's mobile; the worker sees the full address and the report-to name and phone.
- **Ratings:** businesses see each worker's average; workers see each business's average (not per site).
- **Accounts:**
  - Admins sign in with a magic link plus an authenticator app (MFA).
  - One role per login in v1.
  - Distance is straight-line.
- **Invoices:** our legal name, ABN, bank details, invoice prefix and payment terms are placeholder settings. Invoices are marked paid manually.

## How it fits together

- **Stack:** Next.js 16 (App Router, TypeScript), Tailwind v4 and shadcn/ui-style components on Radix. Supabase (Postgres, Auth, Storage) is in Sydney, and Vercel functions are pinned to Sydney (`syd1`).
- **Domain logic** is pure TypeScript in `src/domain`, unit-tested: eligibility, hours split, pay/bill, estimate, expiry, reliability, ranking.
- **Access control:**
  - Reads and writes run as the signed-in user, so RLS always applies.
  - Atomic actions (accept, confirm, clock in, approve, pay run) are Postgres functions that lock rows, so shifts can't be overfilled or double-booked.
  - The service-role key is used only in cron jobs, seeding and audited admin actions.
- **Money and time:** money in integer cents; times in UTC, displayed in Australia/Sydney.
- **Demo mode** (never in production):
  - Email, SMS and push, including login codes, go to `/dev/outbox`.
  - The login page offers "Sign in as…" for seeded users.
  - Admin gets "Run scheduled jobs now".

## Folder structure

```
BRIEF.md  CLAUDE.md  PROGRESS.md  README.md  .env.example  docs/plan.md
.github/workflows/   ci.yml (lint, types, unit, RLS, e2e) · db-deploy.yml (migrations → dev project)
supabase/            config.toml · migrations/ · tests/ (pgTAP RLS tests)
scripts/seed/        demo data
e2e/                 Playwright core flows
public/              manifest, icons, service worker
src/
  config/brand.ts    name, colours, contact
  app/               (public) · worker/ · business/ · admin/ · dev/outbox · api/cron/[job]
  domain/            pure logic + tests
  adapters/          abn, email, sms, push, geocode, identity, police-check, right-to-work, payroll, payments
  server/            server actions and queries per area
  components/        ui/ · layout/ · forms/ · status/
  lib/               supabase clients, guards, AU formatting, zod schemas
```

## Database

RLS is on for every table, deny by default. Admins can read and write everything, and admin views of sensitive records are logged. Nothing is hard-deleted (`archived_at`); employment records can't be deleted at all. **＋** marks an addition to BRIEF.md §9.

| Table                                                                               | Key columns                                                                                                                                               | Who else can access                                                                             |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| profiles                                                                            | id (= auth user), role, name, phone, email, notification prefs                                                                                            | Own row (not role)                                                                              |
| settings                                                                            | key, value, is_public                                                                                                                                     | Public keys readable when signed in; margin and on-costs admin-only                             |
| audit_log                                                                           | actor, action, table, record, worker, before/after, IP, time                                                                                              | Admin read only; written by triggers and server; immutable                                      |
| ＋admin_flags                                                                       | kind, links, status, resolution                                                                                                                           | Admin only                                                                                      |
| workers                                                                             | names, DOB, photo, suburb, lat/lng, radius, transport, status, ratings, reliability, urgent opt-in, available-now-until, payroll ID/status, step statuses | Own (status/ratings/payroll locked). Businesses never read this table                           |
| ＋worker_cards (view)                                                               | preferred name + last initial, photo, rating, reliability, shifts done, verified ticket names                                                             | Businesses, only for workers who applied to, were assigned to or were favourited by them        |
| ＋identity_checks                                                                   | doc type, ID image + selfie, status, reference, reviewer, images-deleted date                                                                             | Own                                                                                             |
| work_rights                                                                         | citizen/visa, evidence, subclass, grant no., passport, expiry, conditions, consent, VEVO date/result/reference, next check                                | Own; editable while pending/rejected                                                            |
| worker_credentials                                                                  | type, number, issued, expires, document, status, verifier, rejection reason, last warning                                                                 | Own; resubmit if rejected                                                                       |
| worker_categories                                                                   | category, years, level (admin-set)                                                                                                                        | Own (not level)                                                                                 |
| ＋availability_weekly / ＋availability_blocks                                       | day + times / blocked dates                                                                                                                               | Own                                                                                             |
| businesses                                                                          | ABN details, ABR checked, status, billing contact, accounts email, account terms, payment days                                                            | Members; owner edits details                                                                    |
| business_users, ＋business_user_sites                                               | role, invite, supervisor sites                                                                                                                            | Members read; owner manages                                                                     |
| sites                                                                               | address, suburb, state, lat/lng, geofence, notes, report-to                                                                                               | Members (supervisors: own sites); workers get the suburb until confirmed                        |
| favourites, blocks                                                                  | business, worker (+ reason)                                                                                                                               | Owner/managers; workers can't see blocks                                                        |
| categories, ＋category_credentials, credential_types, ＋hazards, ＋ppe_items        | catalogue fields, credential kind, max age                                                                                                                | All signed in read; admin writes                                                                |
| agreements, agreement_acceptances                                                   | kind, version, body / who, when, IP, user agent                                                                                                           | Read current; accept as self (server captures IP); immutable                                    |
| jobs (+ ＋job_credentials, ＋job_hazards, ＋job_ppe, ＋job_photos, ＋job_templates) | site, category, level, type, headcount, fill mode, favourites-first, hazards, controls, PPE + supplier, report-to, status, estimate                       | Members (supervisors: own sites); owner/manager write                                           |
| shifts                                                                              | job, start/end, break, headcount, status, cancellation                                                                                                    | Business as jobs; workers: matched or applied                                                   |
| ＋shift_matches                                                                     | shift, worker, eligible, reasons, rank, visible-from, notified-at                                                                                         | Worker own rows                                                                                 |
| applications                                                                        | status, source, late-cancel flag                                                                                                                          | Worker own; business for its shifts; writes via functions                                       |
| assignments                                                                         | shift, worker, status, confirmation/cancellation/arrival                                                                                                  | Worker own; business for its shifts                                                             |
| ＋assignment_rates                                                                  | pay, bill, margin snapshots, rate ids                                                                                                                     | Admin only (workers see pay, businesses see bill via views)                                     |
| ＋attendance_events                                                                 | clock-in/out, arrival, break; device + server time, location, accuracy, distance, inside, reason, offline                                                 | Worker adds own; business reads its shifts                                                      |
| timesheets                                                                          | start, finish, break, hours by type, allowances, status, original/adjusted, approver, auto-approve time, notes, resolution, pay run, invoice              | Worker reads + dispute note; managers/site supervisor approve/adjust/dispute; locked in pay run |
| safety_reports                                                                      | assignment, reporter, description, photos, status                                                                                                         | Reporter                                                                                        |
| ratings                                                                             | assignment, direction, score, tags, private note                                                                                                          | Rater, once, after approval                                                                     |
| rate_cards, bill_rate_rules, ＋public_holidays                                      | scope, category, level, base, multipliers, markup/fixed, effective dates                                                                                  | Admin (holidays readable)                                                                       |
| pay_runs, pay_run_lines, invoices, invoice_lines                                    | period, status, export / number, GST, total, PDF                                                                                                          | Invoices: business owner/managers; rest admin                                                   |
| licences, ＋jurisdictions                                                           | state, number, expiry / required, on-invoice, worker notice                                                                                               | Read; admin writes                                                                              |
| notifications, notification_templates, ＋push_subscriptions                         | channel, template, priority, status, scheduled-for, sent/read                                                                                             | Own; templates admin                                                                            |

**Storage buckets (all private, short-lived signed URLs):**

- `identity` — deleted after verification.
- `worker-docs` — admin-only.
- `worker-photos` — businesses get links only for connected workers.
- Also `job-photos`, `safety-photos`, `invoices` and `exports`.

## Pages

- **Public:** landing ("Find work" / "Hire workers"), how it works ×2, FAQ, privacy, collection notice, terms, contact, login.
- **Worker:**
  - onboarding 1–10 and home (next shift, offers, checklist)
  - find shifts, shift detail, my shifts
  - live shift (clock in/out, safety), timesheets
  - profile and tickets, availability, notifications, settings
- **Business:**
  - onboarding and dashboard
  - post-work wizard (template/repeat → where/what → when → hazards & PPE → workers & fill mode → estimate)
  - job detail (applicants, confirmed, live attendance)
  - timesheets (bulk approve), workers (favourites, history, blocked)
  - sites, team, invoices, settings
- **Admin:**
  - dashboard and verification queue (document beside details)
  - workers and businesses
  - shift board (red if starting within 24h and not full)
  - queues (disputes, no-shows, safety, flags, suspensions)
  - pay runs and invoices
  - catalogues, rates and holidays, settings, agreements, licences, templates
  - reports and audit log

## Build order

**Phase 0**

- 0.1 Scaffold, docs, brand config, lint/types/Vitest/Playwright.
- 0.2 Local Supabase, base tables, access helpers, RLS tests.
- 0.3 Sign-in (magic link / email code, SMS code), demo "sign in as", outbox, role routing.
- 0.4 Design system: three layouts, wizard shell, status badges, AU formatting, accessibility checks.
- 0.5 Adapter interfaces and mocks.
- 0.6 Seed script: catalogues from the appendix and demo users.
- 0.7 CI, DB deploy workflow, Vercel config (Sydney region, installable app).

**Phase 1**

- 1.1 Catalogues, settings, rate cards, bill rules, agreements, licences (admin).
- 1.2 Worker onboarding wizard.
- 1.3 Verification queue → Active.
- 1.4 Business onboarding and approval.
- 1.5 Pay, bill and estimate engine (heavily unit-tested).
- 1.6 Post-work wizard.
- 1.7 Eligibility, matching, ranking, shift feed, urgent call-outs.
- 1.8 Apply / pick / auto-fill, rate snapshots, address reveal, .ics, reminders.
- 1.9 Cancellations, no-shows, reliability, suspension, re-offer.
- 1.10 Clock in/out (GPS, offline queue), safety reports, supervisor tools.
- 1.11 Timesheet approval, disputes, auto-approval.
- 1.12 Ratings, favourites, blocks.
- 1.13 Weekly run: payroll CSV, PDF invoices, emails.
- 1.14 Expiry engine, VEVO re-checks, 24-hour re-check, notification prefs, quiet hours, push.
- 1.15 Admin lists, shift board, queues, reports, audit viewer.
- 1.16 Public pages (legal text marked for review).
- 1.17 Playwright core flows plus the Phase 1 acceptance script (10 workers, 3 businesses, 20 shifts → export and invoices).

## Accounts and keys

| Service                                | When                      | Cost                                | For                                 |
| -------------------------------------- | ------------------------- | ----------------------------------- | ----------------------------------- |
| GitHub                                 | have                      | —                                   | code, CI                            |
| Supabase (dev project)                 | done                      | free                                | database for previews               |
| ABN Lookup GUID                        | requested                 | free                                | live ABN checks                     |
| Vercel                                 | after 0.1                 | free for previews                   | preview links                       |
| Employment Hero                        | by step 1.13              | existing                            | timesheet import template           |
| Twilio · Resend + domain · Google Maps | before launch (ask first) | paid / free tier + domain / billing | SMS · email · address autocomplete  |
| Vercel Pro · Supabase Pro              | before launch             | about US$20 + US$25/month           | commercial use, backups, no pausing |
