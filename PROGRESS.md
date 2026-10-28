# Progress

_Last updated: 28/10/2026_

## Status

**Phase 0: Foundations, complete** (28/10/2026). CI is green on GitHub, and `muster-dev` has the schema and demo data, deployed by the database workflow. Waiting on the owner to connect Vercel for preview links.

**Phase 1: Run real shifts, in progress** (steps 1.1 to 1.6 done). The plan was approved with Phase 0. The 10 open questions in `docs/plan.md` use our recommendations unless the owner changes them.

## Done

- **0.1 Scaffold:**
  - Next.js 16.4 (App Router, TypeScript), Tailwind v4, Radix-based UI components.
  - ESLint, Prettier, Vitest and Playwright set up.
  - Brand config in `src/config/brand.ts`; design tokens in `src/app/globals.css`.
  - `BRIEF.md`, `CLAUDE.md`, `docs/plan.md`, this file, `README.md` and `.env.example` added.
- **0.2 Database base:**
  - Local Supabase config set to match the hosted project.
  - Migrations for:
    - profiles, created on sign-up; the requested role is limited to worker or business user, so admins can't self-register
    - settings (public and admin-only keys)
    - the append-only audit log with a generic change trigger and `log_access_event()`
    - the demo outbox
    - the catalogues: categories, tickets, hazards, PPE, and category defaults
  - Supabase Auth hooks send SMS and email login codes to the demo outbox.
  - 27 pgTAP tests: RLS on every table, anon can't write anything or call any function, profile isolation, no self-promotion to admin, settings visibility, audit log is immutable.
  - TypeScript types generated.
- **0.3 Sign-in:**
  - Mobile (SMS code) or email (code plus link); no passwords. New accounts are created on first sign-in; the "Find work" and "Hire workers" paths set the role.
  - Session refresh in `src/proxy.ts`. Access checks live in `src/lib/auth.ts` (`requireRole`), backed by RLS.
  - Role areas `/worker`, `/business` and `/admin` are guarded; users are sent to their own area.
  - Demo mode: a banner on every page, the `/dev/outbox` page, and "Sign in as" for seeded `@demo.test` accounts.
  - Australian phone and date/money helpers with unit tests.
  - Playwright tests (mobile and desktop):
    - worker SMS sign-up
    - business email sign-up
    - email link
    - wrong code
    - non-Australian number
    - role redirects
    - sign-out
- **0.4 Design system and layouts:**
  - Hand-written UI components: buttons, inputs, selects, checkboxes, radios, switches, tabs, dialogs, slide-out sheets, alerts, badges, cards, tables, avatars, progress.
  - Status wording with "what happens next" for worker, ticket/check and business statuses.
  - Building blocks: page header, empty state, wizard layout (progress, step list, sticky "Save and continue", "Finish later").
  - Layouts:
    - public header and footer
    - worker app with bottom tabs and a menu
    - business and admin areas with a sidebar on desktop and a slide-out menu on phones
  - Every page in the plan is reachable. Unbuilt pages say which Phase 1 step builds them.
  - Demo-only `/dev/ui` (UI kit) and `/dev/ui/wizard` for design review.
  - Draft privacy, terms, FAQ and contact pages, marked for legal review.
  - Automated accessibility checks (axe, WCAG 2.1 AA) on public pages, the UI kit, the wizard and the worker and business areas: zero violations. 36 browser tests pass on phone and desktop sizes.

- **0.5 Adapters:** each one has an interface plus a mock or manual implementation, with a factory chosen by env var:
  - **ABN:** checksum validation; live ABN Lookup client that unwraps JSONP (used when `ABN_LOOKUP_GUID` is set); mock with fictional demo businesses, including a cancelled ABN and a sole trader.
  - **Email, SMS and push:** mocks deliver to the demo outbox. The outbox page has a "Send test messages" button.
  - **Address lookup:** mock using a built-in list of about 60 Sydney suburbs. It understands "12 George St, Parramatta" and places addresses near the suburb centre, the same spot every time.
  - **Identity, police check and right to work:** manual review (admin) for v1.
  - **Payroll:** CSV export. The columns are a draft until we have the owner's Employment Hero template.
  - **Payments:** account terms (pay by bank transfer).
  - 70 unit tests in total.

- **0.6 Demo data** (`npm run seed`, safe to run repeatedly; refuses remote databases unless `SEED_ALLOW_REMOTE=true`):
  - 25 policy settings. Values marked PLACEHOLDER need the owner's confirmation, and on-costs need a payroll professional.
  - The appendix catalogues: 8 categories with required tickets and default PPE, 17 ticket types, 10 hazards, 12 PPE items.
  - 41 demo logins: 2 admins; 9 people across 5 fictional businesses (one awaiting approval); 30 workers in Sydney suburbs.
  - Workers are active, pending, draft or suspended, with verified, pending, rejected, expired and soon-to-expire tickets.
  - Worker visas: citizens, permanent residents, a New Zealand citizen, a bridging visa with no expiry, and a student visa with a work-hours condition.
  - Worker details and tickets are defined now and get loaded into Phase 1 tables as those tables are built.
  - Data integrity tests; e2e tests for "Sign in as" each role.

- **0.7 CI and deployment:**
  - GitHub Actions CI on every push: lint, types, formatting, unit tests; then a throwaway local Supabase for the pgTAP tests, demo data, a production build and Playwright.
  - A database deploy workflow applies migrations and demo data to `muster-dev`.
  - Web app manifest and brand icons (`npm run icons` regenerates them after a brand change).
  - `/dev` tools are checked for demo mode on every request.
  - Fix found by the production-build tests: sign-in links in emails now open a "Sign in" button page. Before, simply opening the link (as Next.js prefetching, link previews and email security scanners do) used up the one-time code. 46 browser tests pass against the production build.

- **1.1 Admin catalogues, settings, rates, agreements and licences** (Phase 1):
  - **Schema:** rate cards (category × level; base rate plus a multiplier per day type), bill rules (markup or fixed), NSW public holidays 2026–27, licensing rules by state and our licences, versioned agreements (frozen once published, one current version) with immutable acceptance records. Money and compliance changes are audited.
  - **Screens:**
    - catalogues (categories with required tickets and default PPE, tickets, hazards, PPE)
    - settings, generated from the registry in `src/config/settings.ts`. Placeholders show a badge until saved.
    - rate cards with a live hourly preview and "checked by"; bill rules; public holidays
    - agreements: draft, preview, publish, make current
    - licences, with a warning listing the states where jobs are blocked
  - Hourly pay calculation (`src/domain/rates.ts`) using whole-number maths.
  - Tests: 41 pgTAP, 117 unit and 70 browser tests passing.

- **1.2 Worker onboarding** (Phase 1):
  - **Schema:** workers, right to work, ID checks, work types, tickets, weekly availability and blocked dates, plus three private storage buckets. Workers edit their own records; statuses, levels, verification results and payroll details are admin-only, enforced in the database. Files must sit in the worker's own folder. Changes to worker records are audited against the worker, with passport and visa grant numbers kept out of the log.
  - **Wizard** (`/worker/onboarding`), ten steps that can be left and resumed:
    1. About you: legal and preferred name, date of birth (minimum age setting), face photo.
    2. Contact details: the mobile or email the worker didn't sign up with, confirmed by a code.
    3. Getting to work: suburb picker, travel distance, car, licence, public transport.
    4. Right to work: citizens upload proof; everyone else gives passport and visa details and consents to a VEVO check.
    5. Photo ID: driver licence or passport, plus a selfie.
    6. Work types, experience and a short bio.
    7. Tickets, with what each work type needs, and the police check (issued within the maximum age setting).
    8. Availability: weekly pattern and urgent call-outs.
    9. Employment paperwork: casual contract, Fair Work Information Statement and Casual Employment Information Statement, plus how payroll setup works.
    10. Check and submit.
  - Starting records that the worker read the privacy collection notice. Acceptances are recorded by the server with time, IP address and browser.
  - **Worker home:** a start screen, then setup progress, then (after submitting) each check's status with the reason and a fix link when something is rejected.
  - **Profile** and **Availability** pages (weekly pattern, "available now" for verified workers, blocked-out dates). The step pages double as edit pages after submitting, and lock what has been verified.
  - **Demo data:** all 30 demo workers filled in, with placeholder photos and documents stamped as demo data. Draft workers stop part-way through.
  - Tests: 77 pgTAP, 161 unit and 78 browser tests passing, including the full phone sign-up to submission.

- **1.3 Verification and activation** (Phase 1):
  - **Admin sign-in with an authenticator app.** After the email code, admins set up (first time) or enter a code from an authenticator app. The database itself refuses admin powers without it, so a stolen email link isn't enough. Seeded demo admins skip it, only where the demo data allows. An **Admin team** page lets one admin reset another's app (lost phone).
  - **Verification queue** (`/admin/verification`): new workers oldest first, updates from current workers (new tickets, photos, renewals), and visa re-checks due in the next 14 days.
  - **Worker review page** (`/admin/workers/[id]`), each document beside the details entered:
    - photo: approve, or reject with a reason
    - right to work: citizens' evidence checked then deleted; for everyone else, record the VEVO result (date, reference, expiry, conditions, hours limit). The next check is worked out automatically (visa expiry, or 3 months for a bridging visa with no end date). Re-checks are recorded the same way.
    - photo ID: compare ID and selfie with the name and date of birth, keep the last 4 characters of the document number; the images are deleted on saving
    - tickets: verify (a renewal replaces the old copy) or reject; police certificates are deleted after checking
    - work type levels, payroll setup (Employment Hero employee ID and status), paperwork accepted
    - **Activate**, once photo, right to work, ID and payroll setup are done
  - Rejections come with ready-made reasons the admin can edit. The worker gets a text and sees the reason with a "fix it" link.
  - Every view of worker documents is logged.
  - Tests: 93 pgTAP, 169 unit and 86 browser tests passing.

- **1.4 Business onboarding and approval** (Phase 1):
  - **Schema:** businesses, their people (owner, manager, site supervisor) and sites, plus which sites each supervisor looks after.
    - Register details (legal name, ABN status, GST, ACN) are written only by the server after an ABN lookup. One business per ABN.
    - The owner edits the billing contact; status, approval and account terms are admin-only, enforced in the database. A cancelled ABN can't be approved.
    - Invites are by email and are matched to the account that signs in with that email. One business per login.
    - Supervisors see only their own sites; owners and managers see them all.
  - **Sign-up wizard** (`/business/onboarding`), six steps that can be left and resumed:
    1. ABN lookup (the demo register until the ABN Lookup GUID arrives). Invalid, cancelled and already-registered ABNs are refused.
    2. Billing contact and accounts email.
    3. Sites: address lookup, access and parking notes, who to report to, and an optional clock-in distance.
    4. Invite managers and supervisors (optional).
    5. The Labour Hire Services Agreement, recorded with time, IP address and browser.
    6. Check and submit.
  - **Business area:** dashboard by status; **Sites** (add, edit, remove); **Team** (invite, change roles, give supervisors their sites, resend or remove); **Settings** (register details, billing contact, payment terms and the agreement).
  - **New agreement versions:** when we publish a new Labour Hire Services Agreement, the dashboard and Settings ask the owner to read and accept it.
  - **Admin** (`/admin/businesses`): businesses awaiting approval first, oldest first. Each business page shows register details, billing contact, sites, people and the agreement.
    - "Check the register again" updates the details. A cancelled ABN puts the business on hold.
    - Approve with or without account terms, and set payment days (default from settings).
    - Decline or put on hold with a reason (ready-made reasons, editable); take off hold later.
    - The owner is emailed each time.
  - **Business-specific rates:** a pay rate card or bill rule can apply to one business, for example a "same job, same pay" order or a negotiated margin. Set from the business page or the rates pages.
  - **Demo data:** 5 businesses with people, sites and supervisors (one awaiting approval). Harbour Restoration has a 15% margin.
  - **Accessibility:** long documents scroll in a box that can be reached by keyboard. Long email addresses wrap on phones. The browser checks now also fail any page that scrolls sideways (WCAG reflow).
  - Tests: 117 pgTAP, 173 unit and 110 browser tests passing.

- **1.5 Pay, bill and estimate engine** (Phase 1):
  - **Hours split** (`src/domain/pay.ts`): each worked minute takes the first rate that applies, in the plan's order: public holiday, Sunday, Saturday, overtime, night, ordinary.
    - Days and night hours follow the site's local time, so shifts over midnight or a daylight-saving change are split correctly (other states' time zones too).
    - Daily overtime counts from the start of the shift.
  - **Pay and bill:**
    - Pay is hours × the rate card. The bill is pay plus on-costs plus the margin, or fixed bill rates.
    - A shorter shift is topped up to the work type's minimum engagement.
    - Urgent call-outs add the urgent loading to pay (as an allowance) and to the bill.
    - Each shift gets GST and our margin. Estimates add up shifts and workers, and apply GST once.
  - **Which rates apply:** the business's own rate card for the work type and level if it has one, otherwise the standard card; the most specific bill rule; in each case the latest start date on or before the shift.
  - **Rate calculator** (`/admin/rates/calculator`): try any business, work type, level, state, date and times. It shows the split, pay, bill, GST and margin, and which card and rule were used.
  - Tests: 117 pgTAP, 202 unit and 112 browser tests passing. The engine's tests cover daylight-saving changes, other states' time zones, minimum engagement, urgent loadings, fixed bill rates and rounding.

- **1.6 Posting work** (Phase 1):
  - **Schema:** jobs and their shifts, required tickets, hazards, PPE, photos and saved templates.
    - Owners and managers build a job as a draft; supervisors see the jobs at their sites.
    - `post_job()` in the database checks everything before a job goes live: approval, account terms, the current services agreement, states where we'd need a licence, future shifts, and the hazard section.
    - Once posted, the business can't change a job (cancelling arrives in step 1.9). "Post again" copies it.
  - **Post work** (`/business/post`): carry on with a draft, repeat the last job, use a template, or start a new job. Businesses that can't post yet are told why.
  - **Five steps**, each saved as you go:
    1. What and where: one shift, several days, or an urgent call-out; site; type of work; number of workers.
    2. When: a date (or a date range and weekdays for several days), start, finish and unpaid break. Overnight shifts finish the next morning. Urgent call-outs start from an hour away.
    3. Tickets and instructions: the work type's usual tickets are ticked, the police check question, instructions, up to three photos, and who to report to.
    4. Safety: hazards or "no known hazards", the controls in place, induction, PPE and who supplies it.
    5. Check and post: everything on one page with "Change" links, the cost estimate with how it was worked out, how to fill the job ("I'll choose" or "First in"), favourites first, and saving it as a template.
  - **Jobs** (`/business/jobs`): coming up, past and cancelled. Each job page shows its shifts, the estimate when posted and everything workers will see, with "Post again" and "Save as a template". The dashboard lists the next two weeks of shifts.
  - **Demo data:** four demo businesses have posted jobs (a multi-day flood strip-out, an evening clean, an urgent make-safe and a contents pack-out), topped up whenever a business has no upcoming work.
  - Tests: 142 pgTAP, 229 unit and 122 browser tests passing.

## Next

- **Owner:** set up Vercel (steps in the README), then send the site address.
- **Then:** push the Supabase sign-in settings (allowed redirect URLs, demo login-code hooks) to `muster-dev` with `supabase config push`, so code sign-in works on the preview. Until then, use "Sign in as".
- **Phase 1, step 1.7:** matching workers to shifts:
  - eligibility rules (active, tickets verified and valid on the day, right to work, travel distance, availability, no overlapping shift, police check)
  - ranking (favourites, past shifts with the business, rating, reliability, distance, experience)
  - the worker's shift feed, and urgent call-outs to every eligible worker nearby

## Decisions

| Date       | Decision                                                                                                                                          | Why                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 28/10/2026 | Next.js 16.4 with **Cache Components off** (the 16.4 template turns it on).                                                                       | Nearly every page is per-user and holds personal data, so it's rendered per request. That's simpler and there's no risk of caching one person's data for another. Revisit before Next 17, where it becomes the default. |
| 28/10/2026 | UI components are hand-written in shadcn/ui style on the `radix-ui` package.                                                                      | `ui.shadcn.com` is blocked from the cloud build container. Same components, same look.                                                                                                                                  |
| 28/10/2026 | Fonts come from the `geist` npm package, not Google Fonts.                                                                                        | No network fetch at build time.                                                                                                                                                                                         |
| 28/10/2026 | Hosted Supabase project `muster-dev` (Sydney): Data API on, "automatically expose new tables" **off**, automatic RLS **on**.                      | Defence in depth. Every migration grants table access explicitly, and the local database is set up the same way.                                                                                                        |
| 28/10/2026 | The Supabase access token for CI is scoped to `muster-dev` only, with full access and no expiry. Stored as GitHub secret `SUPABASE_ACCESS_TOKEN`. | CI needs to apply migrations and auth config. If it's ever exposed, delete it at supabase.com → Account → Access Tokens.                                                                                                |
| 28/10/2026 | The dev project gets demo data from CI using the GitHub secret `SUPABASE_SECRET_KEY`.                                                             | The seed script creates demo users through the Auth admin API. Dev project only; production will never be seeded.                                                                                                       |
| 28/10/2026 | Servers and unit tests run in UTC; all display goes through Australia/Sydney helpers.                                                             | Brief §1. Vercel runs in UTC, so tests do too.                                                                                                                                                                          |
| 28/10/2026 | Login codes (SMS and email) go through Supabase Auth hooks into `dev_outbox` while in demo mode. A placeholder Twilio provider is switched on locally because Supabase disables phone login without one; the hook intercepts every message first. | Demo and tests work with no SMS/email accounts. Production will point the hooks at our SMS/email adapters (Twilio/Resend), with the owner's OK. |
| 28/10/2026 | Join tables (`category_credentials`, `category_ppe`) use composite primary keys instead of a UUID id; append-only tables (`audit_log`, `dev_outbox`) have `created_at` but no `updated_at`. | Small, deliberate exception to "every table has a UUID id and created/updated timestamps" (brief §9): these rows are never edited. |
| 28/10/2026 | Users may update only their own name and notification preferences on `profiles` (column-level grant). Email and phone are copied from Supabase Auth, where they're verified. | Stops anyone changing their own role or contact details without verification. |
| 28/10/2026 | Sign-in uses a 6-digit code for both SMS and email (the email also has a link). Businesses don't get a password option for now. | On iPhone an emailed link opens Safari, not the installed app, so a typed code works everywhere. No passwords means no reset flow. The brief allows passwords for businesses; we can add them if the owner wants. |
| 28/10/2026 | "Sign in as" works only for `@demo.test` accounts and only when `DEMO_MODE=true`. | `.test` is a reserved domain, so it can never match a real person's account. |
| 28/10/2026 | Demo people are fictional: `.test` emails, mobiles from ACMA's 0491 57x range reserved for fiction, landlines from 02 5550 xxxx, and made-up business names with valid-checksum ABNs. | No real person or business can be contacted or misrepresented by demo data. |
| 28/10/2026 | Seeded minimum engagement hours (3–4 h by category) and all money settings are placeholders. | Brief §4.8 and §12: rate cards and rules are set by admin and checked by a payroll professional. |
| 28/10/2026 | Business-specific rate cards and bill rules have the column now; the screens to set them arrive with business accounts (step 1.4). | The businesses table doesn't exist until 1.4. |
| 28/10/2026 | On-costs (super, workers' comp, payroll tax, insurance) apply to all hours, including overtime. | Simple and conservative for billing. Super isn't payable on overtime, so margin is slightly understated on overtime hours. Revisit with a payroll professional. |
| 28/10/2026 | Admin forms submit without React's automatic form reset. | Otherwise a validation error wipes what the admin typed. |
| 28/10/2026 | The worker wizard has ten steps. The police check is part of the Tickets step, "Contact details" is a step of its own, and "About you" and "Getting to work" are separate. | Same content as brief §4.1, in short screens with one main button each. The police check is a ticket in the catalogue, so it's managed like one. |
| 28/10/2026 | Workers confirm both a mobile and an email with a code before submitting. Changing a mobile or email now needs a code sent to the new one (Supabase confirmations on, as on the hosted project). | Urgent work and reminders go by text; payroll setup invites go by email. Without codes, anyone could put someone else's number on their account. |
| 28/10/2026 | Photos are shrunk in the browser before upload, and files go straight from the phone to private storage in the worker's own folder. | Faster on mobile data, and re-drawing the photo drops the GPS location phones embed in pictures. Large files never pass through our server. |
| 28/10/2026 | Police certificates are stored like ID images: workers can upload but not view them again, and they're deleted after checking. Ticket copies are kept. | Open question 2 in the plan. |
| 28/10/2026 | A worker can have one renewed ticket waiting to be checked while the current one still counts. | Renewing doesn't cost them shifts. Verifying the renewal archives the old ticket (step 1.3). |
| 28/10/2026 | Legal name and date of birth lock once ID has been checked; the worker contacts us to change them. | The ID check would mean nothing otherwise. |
| 28/10/2026 | Availability is one window per day (overnight allowed). "Available now" lasts 4 hours and is only for verified workers. | Simple to set on a phone. Covers the brief's weekly pattern, "available now" switch and blocked-out dates. |
| 28/10/2026 | Agreement acceptances are written by the server with the service-role key. | The IP address and browser come from the request, so a user can't forge or change them. The records can't be edited afterwards. |
| 28/10/2026 | The worker app uses the phone's own pickers (native selects) for lists. | Easier on phones, and the chosen value shows before the page's scripts load. |
| 28/10/2026 | Admin powers need an authenticator app, enforced by the database as well as the app. Seeded `@demo.test` admins are exempt only where the demo data sets `demo_admins_skip_mfa`. | Admin accounts can see ID and visa details, so an email sign-in alone isn't enough. The exemption keeps "Sign in as" usable in the demo; production is never seeded. |
| 28/10/2026 | ID images, citizenship evidence and police certificates are deleted when the admin saves a decision, approved or rejected. We keep the outcome, date, reviewer and a short reference. | Plan question 2. A rejected worker uploads new ones anyway. |
| 28/10/2026 | Payroll setup is recorded by hand in v1: the admin adds the worker in Employment Hero, then records the employee ID and marks setup complete. Activation needs it complete. | Plan question 9. Phase 2 does this through the Employment Hero API. |
| 28/10/2026 | Account messages to workers (rejections, activation) are sent as texts straight away. | They're critical. Step 1.14 moves them into the full notifications system with templates and preferences. |
| 28/10/2026 | A business is created by the server from the ABN register's details, using the service-role key. Only admins can change register details, status or account terms. | The business can't type in or alter what the register says. The server also checks that the ABN isn't already registered, which a business can't see for itself. |
| 28/10/2026 | One business per login. Invites go by email and are matched when that person signs in with the same email. | Simple for v1. Someone who works for two businesses uses a different email for each. |
| 28/10/2026 | Declining a business puts it "On hold" with the reason. There's no separate "rejected" status, and an admin can approve it later. | The owner sees the same thing either way: they can't post work, and they see why. |
| 28/10/2026 | A business can post work only once it's approved **and** on account terms. | Plan decision on posting rights. v1 has no card payments (Stripe is Phase 2). |
| 28/10/2026 | When we publish a new Labour Hire Services Agreement, owners are asked to accept it. Posting work (step 1.6) will need the current version accepted. | The agreement covers every placement. Each acceptance records the version, time and IP address. |
| 28/10/2026 | When we only know how long the unpaid break is, it's placed in the middle of the shift. Recorded break times (step 1.10) are used where we have them. | Where the break falls changes the split for shifts over midnight or into night hours. The middle is a fair, predictable assumption. |
| 28/10/2026 | Overtime is counted per shift from its start; two shifts on one day aren't added together. | Plan question 5: daily overtime only. Payroll does the final award interpretation. |
| 28/10/2026 | A shift shorter than the minimum engagement is topped up at the rate that covered most of it. | So a short Saturday shift is topped up at the Saturday rate. |
| 28/10/2026 | The hourly bill rate is rounded to the cent first, then multiplied by the hours. | Invoices can show "hours × rate = amount", and the sums check out. |
| 28/10/2026 | On-costs apply to the urgent call-out allowance as well as to hours. | It's paid as wages, so super and payroll tax apply. To be checked by a payroll professional. |
| 28/10/2026 | A job is built as a draft saved step by step, and posted by a database function that checks everything first. Once posted, the business can't change it; "Post again" copies it without the dates. | Workers make decisions on what they were shown, so posted details don't move under them. Cancellations come in step 1.9. |
| 28/10/2026 | A job's level is the work type's default; only admins change it. | Plan question 4. Businesses don't know our levels. |
| 28/10/2026 | Work types that need a police check always need one; a business can ask for one on other jobs. | Brief §4.1 step 7: "only required where the category or host requires it". |
| 28/10/2026 | Jobs can be posted up to 180 days ahead, with up to 40 shifts. Shifts are up to 14 hours with breaks up to 120 minutes. A multi-day job has the same hours each day. | Sensible limits that catch typing mistakes; more can be posted as another job. |
| 28/10/2026 | Urgent call-outs default to "First in" and an hour from now. | Brief §4.4: auto-fill is the default for urgent call-outs. |
| 28/10/2026 | Who supplies PPE is one answer per job: us, the workers, or some of each (with a note). | Simple to answer; the note covers mixed cases. |
| 28/10/2026 | The cost estimate is saved when a job is posted, for reference. Invoices use the hours actually worked and the rates fixed when each worker is booked (step 1.8). | Brief §4.3: the estimate is shown before posting; billing follows timesheets. |
| 28/10/2026 | Times are entered and shown in Sydney time. | v1 places workers in Greater Sydney. The pay engine already handles other states' time zones for later. |
| 28/10/2026 | The most specific bill rule wins: the business's rule for the category, then its rule for all categories, then the category's standard rule, then the default margin. Only one rule per business, category and start date. | Plan: a margin with per-category and per-business overrides. The pay and bill engine (step 1.5) always finds exactly one rule. |

## Open questions for the owner

- **The 10 questions in `docs/plan.md`.** We're using the recommendations unless the owner says otherwise. They must be settled before Phase 1 starts.
- **How quickly will new workers be checked?** The app tells workers "usually within two business days". Change it if that's not realistic.
- **Employment Hero timesheet import template.** Needed by step 1.13.
- **Company details for tax invoices** (legal name, ABN, address, bank details). Placeholders until provided.
- **Changing a posted job.** For now a business can't edit a job once it's posted, because workers decide on what they were shown. From step 1.9 they'll be able to cancel and post again. Should they be able to change small things, like the instructions or who to report to, after posting?

## Before launch (not now)

- Set `DEMO_MODE=false` in production; seed demo data into the dev project only.
- Create the first real admin account (sign in once, then set its role to admin in the database). Every other admin can be managed from the app after that.
- Point the Supabase Auth SMS and email hooks at our adapters (Twilio, Resend). These are paid services: ask the owner first.
- Turn on CAPTCHA for code requests (Cloudflare Turnstile is free) to stop SMS-pumping fraud once real texts cost money.
- Upgrade to Vercel Pro and Supabase Pro (commercial use, backups, no pausing). Ask the owner first.

## Owner setup checklist

- [x] Supabase organisation "Muster" and project `muster-dev` (Sydney region).
- [x] GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`, `SUPABASE_SECRET_KEY`.
- [ ] ABN Lookup GUID requested at abr.business.gov.au. When it arrives, add `ABN_LOOKUP_GUID` to Vercel and to the cloud environment's variables.
- [ ] Vercel project imported from GitHub, environment variables added (steps in README).
- [ ] Decide whether the GitHub repository should be private. It's public now, so anyone can read the code and BRIEF.md.
- [ ] Optional: allow `ui.shadcn.com` and `abr.business.gov.au` in the cloud environment's network settings, so the shadcn CLI and the live ABN lookup work from the build container.
