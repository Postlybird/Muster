# Progress

_Last updated: 14/11/2026_

## Status

**Phase 0: Foundations, complete** (28/10/2026). CI is green on GitHub, and `muster-dev` has the schema and demo data, deployed by the database workflow. The site is live on Vercel at https://www.shifta.com.au (01/11/2026; first at https://muster-two-mauve.vercel.app, which still works).

**Phase 1: Run real shifts, built** (28/10/2026). All 17 steps are done, and the Phase 1 acceptance run passes: 3 businesses and 10 workers sign up and are approved, 20 shifts are filled and worked, and the payroll file and invoices are made, all through the app (the run only fast-forwards the week). Before real shifts, the owner items under Next are needed (hosting, scheduled jobs, the payroll template, our company details, and the documents checked against the official guides and approved by the owner). The 10 open questions in `docs/plan.md` use our recommendations unless the owner changes them.

**Going live: stage 1 built** (03/11/2026). Real email (Resend), texts (Twilio), address search (Google Maps) and a bot check (Cloudflare Turnstile) are ready behind their adapters, waiting only for the accounts and keys. The live site's own database, sign-in settings and release workflow are ready, and invoicing gained overdue reminders, credit notes and a sales and GST report. The demo stays as it is, and moves to demo.shifta.com.au at the switch-over. Next is stage 2: the owner opens the accounts, one at a time (`docs/launch.md`).

**Launch timing** (owner, 04/11/2026): the company, Shifta Pty Ltd, is registered with ASIC, and for GST and PAYG withholding, in January 2027, when the owner is back from Brazil. Real shifts start after that, once workers' compensation is in place; until then the work continues on the demo, and the paid accounts can wait.

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
  - **Address lookup:** mock using a built-in list of about 150 suburbs around Australia (about 60 in Sydney). It understands "12 George St, Parramatta" and places addresses near the suburb centre, the same spot every time.
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

- **1.7 Matching workers to shifts** (Phase 1):
  - **Rules** (`src/domain/eligibility.ts`): a worker can take a shift when they're active, not blocked by the business, do that type of work at the job's level, hold every required ticket (verified and current on the day), have their right to work confirmed for the day, have a current police check if needed, live within their travel distance, haven't blocked out the day, and aren't booked at the same time (bookings arrive in step 1.8). Visa work-hour limits are flagged for admin, not blocked.
  - **Ranking:** favourites first, then past shifts with the business, rating, reliability, distance and experience. New workers count as 4 stars and 80% reliable. The business will see applicants in this order (step 1.8).
  - **When it runs:** when a job is posted, when an admin activates a worker or decides one of their checks or levels, and when a worker opens Find shifts (so changes to their work types, travel distance or blocked dates show straight away). Each worker's result is saved with the reasons they can't take a shift, for admin views later.
  - **Find shifts** (`/worker/shifts`): the jobs a worker can take, soonest first, one card per job, with the suburb and distance, hourly pay and an estimate, and hazards. The home screen shows the first two.
  - **Shift details** (`/worker/shifts/[id]`): each day with its estimate, pay, hazards and controls, induction, PPE and who supplies it, tickets and instructions, and how the job is filled. The street address, who to report to and the photos stay hidden until they're booked (step 1.8). Applying arrives in step 1.8.
  - **Urgent call-outs:** texted straight away to every worker who can take one, opted in to urgent work, and is available at the start time (weekly hours or "available now"). One text per worker per job, with the pay and a link.
  - **Favourites first:** favourites see new work first for the time the business chose. If none of its favourites can take it, everyone sees it straight away. Urgent call-outs have no head start.
  - **Businesses** see how many workers can see each posted job (never who), and blocks and suspensions take effect at once.
  - Tests: 158 pgTAP, 253 unit and 126 browser tests passing.

- **1.8 Taking work** (Phase 1):
  - **"I'll choose" jobs:** workers apply for all the days of a job or the days they choose, and can withdraw until they're picked. Applying is a promise to work if picked (plan default). The business sees applicants best match first, with their photo, first name and initial, rating, reliability, shifts done and verified tickets, and books someone with one tap for every day they applied for. Whoever posted the job gets an email when the first worker applies.
  - **"First in" jobs:** the first eligible workers to accept are booked straight away. Whoever posted the job gets an email when it's fully booked.
  - **Rules at booking:** eligibility is checked again (brief §4.4), a shift never takes more workers than it needs (even when two accept at once), no one is booked on two shifts at the same time, and blocks and suspensions apply. When a shift fills, the other applicants are told it's been filled.
  - **Rates kept with each booking:** pay, bill and margin are copied from what the shift was priced at when posted, so later rate changes never rewrite history (brief §4.8). Only admins see the rates behind them.
  - **Once booked**, the worker sees the full address, getting-in and parking notes, who to report to (with their phone), the job's photos, directions, and an "Add to calendar" file. The business sees the worker's full name and mobile number.
  - **Worker app:** "My shifts" lists booked shifts, applications and shifts filled by others; the home screen shows the next booked shift. A job that's been filled or taken down says so (for old links in texts).
  - **Business:** each shift shows how many are booked, on the job page and the dashboard.
  - **Reminders:** the day before and two hours before, by text, never twice. They run when the scheduler calls `/api/cron/reminders` with the `CRON_SECRET` (on since 30/10/2026).
  - **Demo data:** applicants and a booked worker on the Harbour flood job, and a booked cleaner on the Westside evening clean. Liam O'Brien is left free to try applying.
  - Tests: 188 pgTAP, 263 unit and 132 browser tests passing.

- **1.9 Cancellations, no-shows and reliability** (Phase 1):
  - **Workers cancel** booked shifts that haven't started ("Can't make it?"), giving a reason. Inside the late window (a setting, 12 hours for now) it counts against their reliability. The shift reopens and is offered to other workers straight away (urgent call-outs are texted to anyone not yet told), and whoever posted the job gets an email.
  - **Businesses cancel** a shift or the whole job, with a reason we pass on; booked workers are texted. Inside the business's late window, each booking is charged a set number of hours (settings), recorded on the booking for invoicing in step 1.13. If the "pay workers" setting is on, the worker is paid the same hours. A job with nothing left is closed off.
  - **No-shows:** once a shift has started, owners, managers and the site's supervisors can report a booked worker who didn't turn up. The worker is texted and admins are flagged; a second no-show within 30 days (settings) puts the account on hold, so no new shifts until an admin reviews it. Existing bookings stay for the admin to decide. Automatic alerts come with clock-in in step 1.10.
  - **Reliability** covers the last 20 shifts (a setting): a worked shift counts as 100%, a late cancellation 50%, a late arrival 75% (two new placeholder settings) and a no-show 0%. Early cancellations and the business's own cancellations don't count. It shows "New" until there's something to count. Businesses see it on worker cards.
  - **Finished shifts:** a scheduled job (`/api/cron/finish-shifts`) closes off shifts and jobs whose time has passed, and brings reliability and "shifts done" up to date.
  - Workers see bookings the business cancelled, in My shifts and on the job page.
  - Tests: 208 pgTAP, 271 unit and 140 browser tests passing.

- **1.10 On the day** (Phase 1):
  - **Clocking in and out:** from two hours before a booked shift until twelve hours after it ends, the shift page shows "On now" with one big button: Clock in, then Clock out. It checks the phone's location against the site (each site's radius, or the setting: 200 m for now). Away from the site, or with no location, the worker can still clock in by saying why, and admins are flagged.
  - **No signal:** the clock-in is saved on the phone with the time it happened, and sent as soon as there's a connection.
  - **Safety:** "Report a safety issue" (with an optional photo) reaches every admin by email straight away and is flagged. Only the reporter and admins can see it.
  - **Businesses** see when each worker clocked in and out (and where, if away from the site), confirm someone has arrived when their phone couldn't ("They're here"), or report a no-show.
  - **Possible no-shows:** a scheduled job (`/api/cron/attendance`) flags anyone booked who hasn't clocked in 30 minutes after the start (a setting), once each, and emails whoever posted the job.
  - Tests: 226 pgTAP, 273 unit and 148 browser tests passing.

- **1.11 Timesheets** (Phase 1):
  - **Made automatically:** clocking out makes the timesheet. Paid time runs from the clock-in (or the rostered start, if they clocked in early) to the clock-out, less the rostered break. If someone clocks in but not out, an hour after the shift the timesheet uses the rostered finish; a late clock-out still fills it in until the business has looked at it. Nobody can clock in or out once the hours are in.
  - **Businesses** (owners, managers and the site's supervisors) get an email when hours are ready, then on **Timesheets**:
    - approve everything waiting in one go (all ticked), or open one to check it
    - change the hours and break, with a note we text to the worker; that approves them
    - query them with our team
    - for someone who didn't clock in, add their hours, or report a no-show
  - **Auto-approval:** hours nobody approves or queries within 48 hours (a setting) are approved as they are, and whoever posted the job is emailed.
  - **Workers** see their timesheets with the pay once approved. They can add a note for the business, and query approved or changed hours once.
  - **Queries** go to a new admin **Queues** page with both sides' notes. An admin pays the hours (changed if need be) or finds they weren't worked, and both sides are told. The page also lists other open matters (no-shows, safety reports and so on); acting on those arrives in step 1.15.
  - **Costs:** approved hours are costed straight away with the rates kept on the booking: pay (with any urgent allowance), on-costs, the charge and our margin, topped up to the minimum engagement. Businesses see the charge excluding GST; workers see their pay.
  - **Reliability** now counts a booking once its hours are in. A start after the grace period (5 minutes, a placeholder setting) counts as a late arrival.
  - **The job page** shows each booking's timesheet, and "Add their hours" once a shift is over.
  - **Demo data:** last night's Westside clean with two timesheets to approve (one with no clock-out), and a Harbour shift last week with approved hours and a query for admins.
  - Tests: 268 pgTAP, 307 unit and 156 browser tests passing.

- **1.12 Ratings, favourites and blocks** (Phase 1):
  - **Ratings:** once the hours are approved, the business rates the worker (1 to 5 stars, with tags like punctual, hard-working and would rehire) and the worker rates the site (tags like safe site and clear instructions), once each. Comments go only to our team, on the admin worker and business pages.
  - **Averages:** businesses see each worker's average on worker cards, as before. Workers now see each business's average with its work, in Find shifts and on the job page.
  - **Favourites and blocks:** when rating, owners and managers can add the worker to their favourites or block them. The new **Workers** page lists favourites, everyone who has worked for the business, and blocked workers, with a reason only our team sees. Favourites see work first; blocked workers stop being offered the business's work and aren't told. Bookings they already have stay.
  - The business's approved hours show "Rate them" until the worker is rated.
  - **Demo data:** Harbour Restoration rated Ethan Murphy for last week's shift, and he rated the site.
  - Tests: 292 pgTAP, 313 unit and 162 browser tests passing.

- **1.13 Weekly pay and billing run** (Phase 1):
  - **The run:** each week, Monday to Sunday, is run once, on the run day (a setting, Monday for now) by a scheduled job, or by an admin from the new **Pay runs** page once the week is over. It takes every approved hour not yet paid from that week or before, plus late cancellations by businesses, and makes:
    - a **payroll file** (CSV) with each shift's start, finish, break, work type, site and any urgent allowance, for the payroll provider's timesheet import (draft columns until we have the Employment Hero template)
    - **one tax invoice per business**, a line per worker per shift, with GST, due on the business's account terms (14 days for now). Each is saved as a PDF and emailed to the business's accounts email with the PDF attached.
  - **Before running,** the page shows the week's lines, pay, invoices and totals, and what's left out: hours still waiting for the business (they go in a later run), queried hours, and workers with no payroll employee ID.
  - **Late cancellations:** the hours charged when the business cancelled, at the rate that would have covered most of the shift. A worker who had already arrived is paid, and the business charged, at least the minimum engagement.
  - **Paid hours are locked:** once hours are in a run, nobody can change them.
  - **Invoices:** the admin **Invoices** page lists what's owed (overdue first) and what's paid. Admins mark an invoice paid with the date and bank reference, or take that back if it was the wrong one. Businesses' owners and managers see theirs on **Invoices**, line by line, with the PDF and how to pay.
  - **Settings:** our details for invoices (legal name, ABN, address, contact) and bank account, and the invoice number prefix. The run won't go ahead without the legal name, ABN and bank account. The demo data fills them with made-up details.
  - Tests: 316 pgTAP, 328 unit and 166 browser tests passing.

- **1.14 Notifications, expiry checks and push** (Phase 1):
  - **Notifications:** every message now goes through one system and is kept. Workers see theirs on **Notifications**, with a count on the menu.
  - **Push:** workers who install the app and turn notifications on (in **Settings**) get messages there instead of by text. Urgent call-outs still come by text too. Businesses and our team get emails, as before.
  - **Choosing what you get:** workers turn shift reminders and timesheet messages on or off. Businesses choose emails about applicants, the day and timesheets. Messages about bookings, accounts, tickets and safety always go.
  - **Quiet hours:** non-urgent messages wait until 6 am (a setting). Urgent ones go straight away: urgent call-outs, cancellations, safety reports, bookings at risk, reminders two hours before, and anything about a shift starting within a day.
  - **Message templates:** admins can change the words of every text, email and notification on **Message templates**, with a preview. "Use the standard wording" undoes it.
  - **Push setup:** free, but it needs a pair of keys in the hosting settings. **Admin → Settings → Push notifications** makes them, with the steps. Until then workers get texts (in the demo, pushes go to the outbox).
  - **Expiry checks** (a new hourly job, `compliance`):
    - workers are warned 30, 14 and 7 days (a setting) before a ticket, police check or visa runs out, unless they've already added a renewal
    - on expiry it's marked expired, and they stop being offered work that needs it
    - any booked shift that won't pass the rules on the day (account, tickets, right to work, police check) is flagged in admin **Queues**, and the worker and admins are told, once
    - admins are emailed a week before a VEVO re-check is due (**Verification** lists them from two weeks before)
  - Tests: 332 pgTAP, 348 unit and 178 browser tests passing.

- **1.15 The rest of the admin console** (Phase 1):
  - **Workers:** everyone who has signed up, 50 to a page, with their status, suburb, work types, rating, reliability, shifts and the next ticket or visa to expire. Filter by name, mobile or email, status, work type, verified ticket, suburb or postcode, and tickets or visas expiring within 30 days (the longest expiry warning).
  - **Businesses:** filter by name or ABN, status, and the suburb or postcode of any of their sites.
  - **Shift board:** posted shifts that haven't finished, in the next 24 hours, 7 days or 30 days: under way (who's on site), needing workers (booked and applied), and filled. A shift starting within 24 hours that isn't fully booked shows red, with a count at the top.
  - **Queues:** each open matter has its own page showing what happened (the shift, clock-ins, the safety report and its photos) and what can be done, with a note kept for other admins:
    - possible no-show: they were there (records their arrival at the start time), or they didn't come (records a no-show)
    - no-show: it stands, or excuse it (it no longer counts against their reliability or towards a hold)
    - account on hold: decide about each booked shift (taking them off offers it to other workers), then lift or keep the hold
    - booking at risk: take them off the shift (offered to others; the worker gets the note and the business is told), or let it go ahead
    - safety reports, away from the site and visa work limits: record what was done
  - Possible no-shows settle themselves when the worker clocks in, the business confirms they arrived or reports a no-show. Recently settled matters are listed with their decisions.
  - New messages: taken off a shift (worker, and the business without the reason), no-show excused, and hold lifted.
  - **Reports:** for shifts starting in a period (last 7 or 30 days, this month, last month, or chosen dates): the fill rate (places booked of places posted), the typical time from posting to booking, the no-show rate, active workers and how many worked, then hours, revenue, cost and gross margin by work type and by business, from approved hours before GST.
  - **Audit log:** who viewed, changed or verified personal records, and when, newest first, with what changed. Filter by person (name, email or mobile), what was done, the kind of record and dates; jobs, shifts and settings only when asked for. Each worker's page links to the entries about them.
  - **Dashboard:** what needs attention today, each linking to where it's done: unfilled shifts starting within 24 hours and open safety reports (red when there are any), hours queried, other queue matters, workers to check, VEVO re-checks due, businesses to approve and overdue invoices.
  - Filtered lists keep their filters in the page address, so they can be bookmarked or shared with another admin.
  - Tests: 388 pgTAP, 364 unit and 196 browser tests passing.

- **1.16 Public pages** (Phase 1):
  - **Home:** the two paths, "Find work" and "Hire workers", with how each works in four steps, what we promise (every worker checked, we're the employer, safety on every job), and links to the answers and contact.
  - **Questions and answers:** for workers (who employs them, signing up, what they need, pay, shifts, cancelling, clocking in, safety) and businesses (how it works, signing up, cost, checks, speed, choosing workers, safety, cancelling, timesheets and invoices). Numbers such as cancellation windows come from the settings, so they stay right.
  - **Privacy policy** (with the collection notice that sign-up links to) **and terms of use:** plain-English drafts, marked for a lawyer to check before launch.

- **1.17 Core-flow tests and the Phase 1 acceptance run** (Phase 1):
  - **The acceptance run** (brief §11), done in the app the way people would:
    - 3 business owners sign up, look up their ABN, add a site, accept the agreement and submit; an admin approves each one
    - 10 workers sign up with their mobile numbers and complete the wizard; an admin checks each one's photo, right to work, ID and tickets, records their payroll ID and activates them
    - the businesses post 20 shifts over 6 jobs, some "first in" and some "I'll choose"; workers accept or apply, the owners choose from the applicants, and every shift is filled
    - the booked week is moved back to last week, standing in for the week going by (the only change made outside the app)
    - the owners enter and approve everyone's hours: 25 workers' days
    - an admin runs last week's pay: the payroll file has a line for every shift worked, and each business gets an invoice with its lines and a PDF
  - It runs on every push next to the other checks, taking about 2 minutes on GitHub, and locally with `npm run test:acceptance`.
  - **Core flows:** every flow in the brief has browser tests; `docs/testing.md` lists which. New in this step: favourite workers get their head start on new work.
  - Tests: 388 pgTAP, 364 unit and 208 browser tests passing, plus the acceptance run.

- **New look** (owner's request, 29/10/2026):
  - Navy and a soft hi-vis orange instead of green, on a calm off-white page with white cards, rounder corners and the friendlier Figtree font. Green now only marks things that are done or verified.
  - A logo: a rounded "m" with an orange dot (the point in "muster point"), also on the app icons.
  - A new home page: two clear doors ("I need workers", "I want work"), an example of a shift as workers see it, a four-step guide for businesses and for workers with how long each step takes, what we check and handle, the work we cover, quick answers, and a closing call to action.
  - Then (30/10/2026), on the owner's feedback: a lighter, friendlier blue; menus always on show when signed in (a sidebar on tablets and computers; on phones, tabs and a row of the other pages, with no menu button); and a full-screen public site with edge-to-edge colour bands, a first screen that fills the window, a deep blue footer and a split sign-in page with a brand panel.
  - Quicker posting: the business dashboard and Post work now offer "Post again" for the business's templates and its three most recent different jobs (work type, site and crew size). One tap copies the job, the dates are filled in, and it's "Save and continue", then "Post work".

- **Live site connected** (30/10/2026), once the owner sent the site's address:
  - Sign-in by code on the live site: the hosted project now has its own sign-in settings (`deploy/muster-dev/supabase/config.toml`): the site's address, phone sign-in, and login codes going to the demo outbox. The database workflow pushes them, then checks that a code by text and by email reaches the outbox.
  - Scheduled jobs: Supabase's scheduler calls the site every 10 minutes for reminders, finished shifts, possible no-shows, timesheets and held notifications; hourly for compliance; and early each morning for the pay run (it only runs on the run day). The site's address and `CRON_SECRET` are kept in the project's Vault, put there by the database workflow, which runs one job to check the site accepts the secret. Switched on 30/10/2026, once the owner added `CRON_SECRET` to GitHub: the live site ran the check job. Locally and in CI the jobs do nothing.
  - Tests: 399 pgTAP, 364 unit and 210 browser tests passing, plus the acceptance run.

- **Shifta** (30/10/2026), once the owner chose the name and bought shifta.com.au:
  - The name is Shifta and the slogan is "Staff today, not someday." (workers see "Work today, not someday."). The logo is a rounded "s" with the orange dot, on the app icons too.
  - The website now speaks to every industry: hospitality, events, warehousing, manufacturing, retail, cleaning, construction, office work and restoration. The example shift on the home page is a bartender.
  - The support email is support@shifta.com.au. The phone number is hidden until the owner gives us one.
  - The demo company and bank names on demo invoices are renamed to Shifta, unless an admin has already changed them.

- **Every industry** (30/10/2026, owner's request: "all industries are accepted"):
  - Industries are a new catalogue that admins manage (Admin → Catalogues → Industries): name, a line about it, a paragraph for its web page and an icon. Each work category belongs to one; one without an industry is listed as "Other work".
  - Starting industries: hospitality, events, warehousing and logistics, manufacturing, retail, cleaning, construction and labouring, office and admin, and restoration. 22 new work types (like bartender, barista, kitchen hand, event staff, pick-packer, forklift driver, process worker, retail assistant, builders cleaner, general labourer, traffic controller, receptionist), with new tickets (NSW RSA, traffic controller card, food handler training), hazards and PPE.
  - Workers choose work types by industry (each industry opens to show its work), and businesses choose the type of work from a list grouped by industry.
  - New work types have placeholder pay rates and minimum engagements, like the existing ones.
  - The website has an Industries page and a page for each industry ("Hospitality staff today, not someday."), listing its work types and the tickets each needs, read live from the catalogue, so a new industry or work type appears there by itself. The home page shows the industries as cards, the header links to them and the footer lists them.
  - Branded features, each something the app really does: Shifta Verified (checks), Shifta FastFill (matching, favourites first, texts for short notice), Shifta Live (clock-in, arrival, no-show flags) and Shifta Pay (weekly pay, one invoice a week). No made-up testimonials, logos or numbers.
  - For search engines and sharing: a sitemap (with every industry page), a robots file that keeps the signed-in areas out, and a share picture with the logo and slogan.

- **Loading feedback** (30/10/2026, owner's feedback: links seemed to do nothing): links move between pages without a full reload, so the browser showed no loading at all. Now an orange bar runs across the top while the next page loads (quick ones don't show it), and signed-in pages show the outline of the page straight away while their details load.
  - Tests: 423 pgTAP, 387 unit and 230 browser tests passing, plus the acceptance run.

- **Australia-wide** (30/10/2026, owner's request: "We need australia wide like side kicker"):
  - Every state and territory is in the platform, and admins open each one for work (Admin → States and licences → "Open for work"). NSW is open. Elsewhere, businesses can sign up, add sites and draft work, but can't post it until their state opens; the last posting step tells them why. The database's `post_job()` checks the same thing.
  - A state that requires a labour hire licence (QLD, VIC, SA and the ACT) stays blocked even once it's open, until we record a current licence. The admin page warns about open states without one.
  - The demo address lookup knows about 150 suburbs: Sydney, every other capital, and big regional centres. It tells apart suburbs with the same name in different states (Richmond NSW and Richmond VIC) from the state or postcode typed.
  - Pricing (night, weekend and holiday hours), matching, timesheet costing and pay runs already followed the site's own state and time zone.
  - Times now follow the site too: a Perth shift reads 7:00 am wherever it appears (shift cards and pages, clocking in and out, bookings, reminders and urgent texts, timesheets, invoice lines and the payroll file), and hours a business or our team types in are read in the site's time. Our team's screens say "(Perth time)" where it isn't Sydney's. A worker's quiet hours and availability follow the state they live in.
  - The website says Australia-wide throughout. A Locations page and a page for each of 11 cities (the capitals, the Gold Coast, Newcastle and Wollongong) show "Open now" or "Coming soon", straight from the admin switch. Coming-soon cities invite businesses to get their account ready and workers to sign up early. The sitemap lists them.
  - Tickets each state issues itself, which don't carry across borders (the RSA, working with children checks and traffic control), now have a version for every state, such as RSA (Victoria), Blue Card (Queensland) and Ochre Card (Northern Territory). A worker is asked for their home state's version, and work at a site asks for its state's; the website names them by what they have in common ("Responsible Service of Alcohol (RSA)"). Admins manage the versions in Admin → Catalogues → Tickets ("Accepted in" and "Same ticket in other states"). Issuers and expiry rules are filled in only where we could confirm them.
  - Admin → States and licences shows how many public holidays each state has on file for the next 12 months, and warns about an open state with none (its shifts would be paid without holiday rates).
  - Tests: 423 pgTAP, 387 unit and 228 browser tests passing, plus the acceptance run.
- **Application notes, worker profiles and call-outs** (31/10/2026, owner's go-ahead):
  - **A note with each application.** When a worker applies for a job the business picks for, they can say why they're a good fit (up to 300 characters). The business sees it on the applicant's card. The worker can change it while they wait, and it covers every day of the job they applied for.
  - Notes and the bio from sign-up ("a little about you", up to 500 characters) can't hold a phone number, email address or link, so businesses reach workers through us. The app and the database check the same rules.
  - **Worker profiles.** Businesses open a worker's profile from the applicants, the booked list or their Workers page. It shows their stars with how many ratings, the tags businesses gave ("Punctual × 5"), reliability, badges, their bio, their experience and level in each type of work, the checks we've done (photo ID, right to work, photo, police check and tickets) and their history with that business, with a favourites button. Applicant cards show the badges and the rating count too. A business sees only workers who've applied to or worked for it, or that it has as a favourite or blocked.
  - **Call-outs.** For someone off sick or an extra pair of hands: workers who opted in get a text and an app notification, at any hour, and the first to accept is booked. Call-outs pay 20% more per hour (the charge to the business is 20% more too). Businesses get a "Post a call-out" button on their dashboard (filled in from their latest job), an explanation when they choose one, and live status on the job ("Sent to 6 workers", then who accepted). Open work starting within 48 hours, say after a worker cancels, can be made a call-out from the job page. If nobody has accepted after 20 minutes (a setting), the business and our team are told. The text's link brings a signed-out worker back to the shift after signing in, with an "Accept now" button, and the call-out and "Available now" switches are on the worker's home screen.
  - Tests: 451 pgTAP, 399 unit and 238 browser tests passing, plus the acceptance run.
- **A new home page and sign-in** (31/10/2026, owner's request):
  - The slogan is "Work, sorted.", with "Connecting great businesses with great people, one shift at a time." The logo is bigger in the header, the footer and on the sign-in page.
  - The first screen shows the app at work: an applicant with 5 stars, their reliability, badges and their note on why they're a good fit, and a call-out being accepted. Both are labelled as examples, and the people are made up.
  - **Call-outs** have their own section: four steps, and a phone showing the text a worker gets and the "Accept now" button. The extra pay and the 20-minute alert are read from the settings, so the page changes when they do.
  - **How it works** has a tab for businesses (from creating an account and posting a shift to the weekly invoice) and one for workers (from signing up and adding documents to weekly pay). Each step opens with a tap, with how long it takes. The footer's link for workers opens their tab.
  - **Why Shifta** compares us with a typical agency: booking, knowing who's coming, what you pay, contracts, and keeping someone great (offer them a permanent job, with no placement fee and no agency contract). Then the savings: no sign-up, monthly or placement fees, favourites first, less admin. Each point matches the app and the services agreement.
  - **Inside your account** lists what's in the worker app and the business dashboard. Then weekly pay and support from real people, the industries, quick answers and a last call to action.
  - **Sydney only:** the Locations and city pages are gone, and the website and footer no longer mention other states. The platform still has every state, ready to open more. Industry pages now read "Hospitality staff, sorted."
  - **Sign-in and sign-up are by email only**, on a new layout: the form on one side and an example of the app on the other (a shift offer on the workers' page). Workers add and confirm their mobile number while signing up, because call-outs and reminders come by text. Test accounts made on the live site with only a mobile number can't sign in any more: sign up again with an email.
  - Tests: 451 pgTAP, 399 unit and 236 browser tests, plus the acceptance run.
- **A fuller first screen, led by the core service** (01/11/2026, owner's feedback: too much space above the fold; look at Sidekicker):
  - The first screen is full: a worker's profile as businesses see it (stars, reliability, tags from businesses, shifts done, experience, their licence checked and their note) beside four workers ready to book, and a booking going through. On phones the people come first, then "Work, sorted." and the buttons. The industries sit in one row just below.
  - It leads with what we sell: fast, on-demand labour, **general or skilled**. A new section shows both, with work types from the live catalogue (general labourers, cleaners, kitchen hands, pick-packers and more; forklift drivers, traffic controllers, trades assistants, bartenders and more) and what we check before a first shift.
  - **Call-outs are an add-on**, lower down (after how it works, why us and what's in each account), and the header's link to them is now "Why Shifta".
  - No "Example" labels on any picture of the app, here or on the sign-in pages. The footer says the people and details in them are illustrative.
  - **Photos:** the people show initials for now. Photo libraries are blocked from our build environment, so real photos need the owner (see Next).
- **Quicker sign-up** (01/11/2026, owner's go-ahead, after comparing Sidekicker's):
  - **A menu button on phones and tablets** on the website: Sign in, Register (which opens to "Sign up as a business" or "Sign up as a worker") and the site's pages. Computers get Sign in and Register buttons. The signed-in areas are unchanged.
  - **Register pages** (/register, /register/business, /register/worker): a short form, then the emailed code. No password, and no "How did you hear about us?". Every "Hire staff" and "Find work" button now goes to them.
  - **Businesses:** name, work email, mobile and ABN on the form. After the code, one screen: the business from the ABN register, the services agreement to tick, and "Create my account" (another ABN can be tried if it finds the wrong business). The billing contact starts as the owner (changeable in Settings), sites are added while setting up the first shift, and team invites are on the Team page. Our team gets an alert straight away, and the business can set up its first shift while it waits (posting stays locked until we approve it). The approval email says when a shift is ready to post.
  - **Workers:** name and email on the form. After the code, "Two quick things": confirm their mobile with a texted code, then their suburb, how far they'll travel and the work they want (tap an industry, tick the roles). Their home screen then shows **shifts near them with the pay** (not the business or address, and no way to apply yet) and **"Get ready to work"**: photo and ID, right to work, tickets and paperwork, in their own time. Availability starts as any time, and a car and driver licence can be added later under "Getting to work" in their profile.
  - Tests: 460 pgTAP, 401 unit and 246 browser tests, plus the acceptance run.
- **shifta.com.au connected** (01/11/2026): the site's main address is https://www.shifta.com.au: shifta.com.au sends people there, and the Vercel address still works. Sign-in emails link to it and the scheduled jobs call it. While the site is a demo, every page asks search engines not to list it, and there's no sitemap; that ends when demo mode is switched off at launch.
- **Wordmark logo** (01/11/2026, the owner's pick from seven ideas): the logo is now the name in lower case, "shifta", with the dot of the i in hi-vis orange. It's drawn from the site's own font, so it looks the same everywhere: the header, phone menu, footer, sign-in pages, the signed-in areas and the picture shown when a link is shared. The S icon stays as the app and browser-tab icon.
- **Real pay rates and award overtime** (01/11/2026, the owner's go-ahead; rates checked by the owner's accountant):
  - **The nine launch work types have real rates**, from the Fair Work pay guides effective 1 July 2026, at each award's casual rate plus 50c an hour. On a weekday: general labourer $36.05 (building award); commercial cleaner, builders cleaner, restoration labourer, contents and pack-out crew, strip-out and demolition labourer, and mould remediation assistant $34.35 (cleaning award, level 1); restoration technician $35.46 (cleaning award, level 2); removalist offsider $34.09 (road transport award, grade 1). Weekend, public holiday, overtime and shift rates are worked out from the same rate, so they're above the award too. They apply to shifts from 01/11/2026. The placeholder cards they replace are kept for earlier shifts and marked "Replaced" in Admin → Rates; the other work types still have placeholders.
  - **Overtime follows each award.** After the award's daily hours (7.6 under the cleaning and road transport awards, 8 under the building award), the first 2 hours are at the overtime rate and every hour after at the higher one. Under the building and road transport awards, weekday hours outside ordinary hours (7 am to 6 pm, and 5:30 am to 6:30 pm) are overtime too. On a Saturday under the building award, the first 2 hours before noon are at one rate and the rest at the higher one. Under the cleaning award, a weekday shift starting before 6 am or finishing after 6 pm earns the early or late rate for the whole shift, and one finishing after midnight (by 8 am) the night shift rate. Each hour is paid at the highest rate that applies, so Sunday and public holiday rates still win over overtime. This flows through estimates, offers, bookings, timesheets, pay runs and invoices; the payroll file still sends the hours worked, for the payroll provider to apply the award.
  - **Admin → Rates** shows each card's award rules in plain words, and the rate card form has a section for them, with the hourly pay shown as you type. Bill rules with fixed rates can set a rate for each new kind of hour too (blank charges the closest one).
  - The website's example pay now follows the live rate card: $34.35 an hour for a restoration labourer, and about $165 for a four-hour call-out.
  - Tests: 470 pgTAP, 423 unit and 250 browser tests, plus the acceptance run.
- **Each worker sees their overtime** (01/11/2026, the owner: overtime shown "for each individual"): once a business approves a worker's hours, the worker's timesheet shows how their pay adds up, a line per rate: for example 7.6 hours ordinary, 2 hours of overtime and 0.4 at the higher overtime rate, with any early or late shift loading, top-up to the minimum shift and call-out loading. Each worker's overtime comes from their own hours, so one who stays later than the others on a job is the only one paid overtime. Workers see their pay only, never what the business is charged. Tests: 478 pgTAP, 423 unit and 252 browser tests, plus the acceptance run.
- **Overtime across a worker's shifts** (02/11/2026, the owner's choice: the business pays, told beforehand):
  - We employ every worker for every shift, so their hours with us add up: past 7.6 hours a day (8 for general labourers) or 38 ordinary hours a week, Monday to Sunday, the rest is overtime. The weekly limit is a new setting in Admin → Settings → Pay and billing.
  - Hours add up in the order the shifts were booked. The business whose booking takes a worker past a limit is charged the overtime; a business booked earlier isn't. If an earlier shift is cancelled or finishes early, the overtime shrinks or goes, as the week's hours are costed again before each pay run.
  - **Businesses that pick their workers** see it on each applicant before booking, for example "With their other shifts with us that day (6 h), 2.4 h of this shift would be overtime: about $X more, excluding GST", and on the worker once booked.
  - **First-in shifts and call-outs:** when posting first-in work there's a box, "Let workers on overtime take this shift", with the overtime charge an hour. It's off unless ticked; then workers whose other shifts would put it into overtime aren't offered it and can't take it. A call-out keeps the job's choice, which its confirmation says.
  - **Workers** see it on their booked shift ("about $X more for you") and on their timesheet.
  - Tests: 490 pgTAP, 440 unit and 258 browser tests, plus the acceptance run.
- **A narrower focus: four industries, eight work types** (02/11/2026, the owner: "so it's not too large and we have something to build from"):
  - **What we offer:** general labourers (construction and labouring); commercial and builders cleaners (cleaning); restoration technicians, who now cover all restoration work (restoration); and pick-packers, storepersons, forklift drivers and removalist offsiders (warehousing and logistics).
  - **Everything else is archived, not deleted:** hospitality, events, manufacturing, retail, and office and admin, with their work types, plus traffic controllers, trades assistants and the other restoration roles. Admins can bring any of it back in Admin → Catalogues, but a work type needs a rate card a payroll professional has checked before it can be posted.
  - **Workers keep their work:** anyone who chose restoration labourer, contents and pack-out, strip-out and demolition, or mould remediation now also has restoration technician, and trades assistants also have general labourer, with the same years of experience. A business's templates for archived work are archived too, as that work can't be posted.
  - **Restoration technicians** need a White Card; a business ticks IICRC tickets on a job when it needs a certified technician. All restoration work is now paid at the technician rate: $35.46 an hour on a weekday (the cleaning award's level 2), where labouring work was $34.35.
  - **Warehouse work is coming soon.** Pick-packers, storepersons and forklift drivers come under the Storage Services and Wholesale Award, so they wait for its checked rates. Workers can choose them now; the website marks them "coming soon", and businesses see them greyed out when posting. Their placeholder rates are archived, so nothing is priced below the award.
  - **The website** shows only the four industries. The home page lists only work that can be booked now, and its pictures and example pay use a restoration technician ($35.46 an hour, and about $170 for a four-hour call-out). The demo businesses, workers and jobs moved onto these work types too.
  - Tests: 490 pgTAP, 446 unit and 258 browser tests, plus the acceptance run.

- **Going live, stage 1** (03/11/2026, the owner: "OK keep the demo, start stage 1"):
  - **Real email (Resend):** every email from the app, with invoices and credit notes attached, goes through Resend once it's switched on, sign-in codes included ("Your sign-in code").
  - **Real texts (Twilio):** call-outs, reminders and mobile codes, from the sender name "Shifta". The name has to be registered on the ACMA Sender ID Register through Twilio, or texts show as "Unverified".
  - **Real address search (Google Maps):** site addresses and workers' suburbs anywhere in Australia, through the Places API (New), charged per search.
  - **A bot check (Cloudflare Turnstile, free)** before a sign-in or sign-up code is sent, so bots can't run up text and email costs. People don't see it unless Cloudflare is unsure. Cloudflare is blocked from our build environment, so it's tried first in the live run-through.
  - **Safety checks:** the live site won't build if a real service is missing or set to pretend.
  - **The live database and releases:** the live site gets its own Supabase project with only the real setup (settings, work types, checked rates and tickets) and never demo data; company and bank details start blank for you to enter. The live site changes only when you say "release": its database is updated first, then the site. A workflow makes your account the first admin.
  - **Overdue reminders:** the day after an invoice falls due, then every 7 days (a setting) while it's unpaid, up to 4 times, the business's accounts email gets a reminder with the invoice attached, asking for what's still owed. The invoice page shows how many were sent.
  - **Credit notes:** to correct an invoice that's gone out, our team issues a credit note for an amount and a reason. It's numbered (from CN-1001), takes its share of the GST, is emailed to the business as an adjustment note (PDF), and lowers what's owed; an unpaid invoice credited in full is closed. Businesses see their credit notes with the invoice.
  - **Sales and GST** (Admin → Sales and GST): for a month, BAS quarter, financial year or any dates, the sales and the GST on them (invoices less credit notes) and the payments received, with a spreadsheet to download for the accountant.
  - **Our security review** found nothing serious in the new invoicing, reports or address search, and these, now fixed:
    - Supabase's bot check doesn't cover a signed-in person changing their mobile or email, so one account could have texted any number in the world every minute, or emailed anyone, and run up costs or used up the hourly limits for everyone. Now Supabase hands every code to the live site, which only emails sign-in codes and only texts a new Australian mobile, five times a day per person. There's no sign-in by text (your decision of 31/10/2026) and no changing an email address on the live site.
    - The payroll file could have carried a spreadsheet formula in a business's trading name or a worker's name, which a spreadsheet would run when opened. Text that people type can't start a formula now, there or in the sales report.
    - The live site's GitHub workflows run only from the released version (`main`), and its secrets should be locked to it with your approval (steps in `docs/launch.md`). The first admin's email no longer shows in the public log.
    - For you in stage 2: Twilio set to text Australia only, with SMS pumping protection; a daily cap and a budget alert on Google's address search; and a new cron secret for the live site, not the demo's.
  - Tests: 516 pgTAP, 508 unit and 264 browser tests, plus the acceptance run.

- **Pricing and terms** (03/11/2026, the owner's OK after comparing another agency's rates and terms):
  - **Overtime without super.** Super isn't owed on overtime, so overtime hours are now charged without it, about 11% less than before at the same margin. Each rate card says which rate types are overtime: overtime at both rates by default. Your accountant can tick weekend or holiday rates where the award makes that work overtime (Admin → Rates → the card → "Priced without super"). Bookings priced before keep their prices.
  - **Allowances on rate cards,** paid to the worker and charged to the business (with on-costs but no super, plus the margin). Each is paid on every shift worked, or when the worker stays more than some hours past the booked finish in overtime. From the July 2026 pay guides: general labourers get the building award's fares and travel allowance ($22.41 a shift), and cleaners and restoration technicians the cleaning award's meal allowance ($17.53, after more than 2 hours' overtime past the booked finish). They show on estimates, invoices, the payroll file and the worker's pay. Admins change them in Admin → Rates.
  - **A fee for hiring our workers directly,** in a new draft of the services agreement for the lawyer: 15% of the first year's pay, plus GST, within 180 days of the worker's last shift. On the demo it's waiting unpublished in Admin → Agreements, so nobody is asked to sign again until it's final.
  - Tests: 522 pgTAP, 528 unit and 266 browser tests, plus the acceptance run.
- **Invoices and restoration labourers** (04/11/2026, the owner's OK after comparing another agency's invoice):
  - **A row for each rate on invoices:** each shift's hours, rate and amount by rate, then any call-out loading and allowances, with the job number, the business's PO or reference number, the site, and the award and level of the booking's rate card (Admin → Rates, "Award and level"). Businesses add the PO number on the last posting step or on the job page at any time, and "Post again" leaves it blank. Every job now has a number, from 1001. The PDF and the invoice pages show the same; invoices already sent keep their old lines.
  - **Restoration labourer is back,** at the cleaning award's level 1, for labouring such as strip-outs and pack-outs; restoration technicians stay at level 2 for certified work. Its checked rates were kept, so it can be booked straight away.
  - Tests: 538 pgTAP, 532 unit and 266 browser tests, plus the acceptance run.
- **The owner's 22 decisions** (14/11/2026, the owner: "yes to all"; each is ticked in `docs/launch-questions.md`):
  - **Pay and invoices run on Wednesday,** so weekend shifts approved within the 48 hours go with the rest of their week, and **businesses pay within 7 days** (a large business can have 14, set on the business in Admin → Businesses).
  - **Late cancellations:** a worker who hadn't arrived is paid the 3 hours the business is charged for cancelling late.
  - **Payroll tax is 0% in prices** until wages near NSW's threshold ($1.2 million a year, a new setting). The admin dashboard warns once wages with super pass 80% of it over the last 12 months, or of its monthly share over the last 30 days, and turns red past it.
  - **The fares and travel allowance is paid once a day,** with the first shift booked that day: a new "once a day" choice for allowances on rate cards.
  - **The cleaning long service levy,** 1% of cleaners' ordinary pay, is an on-cost on commercial and builders cleaners, left off overtime and allowances like super: a new "Long service levy %" on each work type (Admin → Catalogues → Work types).
  - **The Fair Work statements:** after the paperwork step, each new worker gets an email with links to both on the Fair Work website, so they keep a copy.
  - **The Sales and GST page** says what goes on the BAS on the cash basis.
  - The changed settings also change on the demo, where nobody had set them. The rest keep what Shifta does now, or come later: the quarterly BAS lodged by the owner, no extra insurance at launch, the June pay guide routine, texts for workers without the app, paid time from the rostered start, deleting ID photos once checked, marketing messages only with opt-in, the trade mark and changes to posted jobs later, "usually within two business days", the public code and the plan's 10 answers. The agreement's additions are in its draft 0.4, written in plain English and checked clause by clause against the law's examples of unfair terms (Australian Consumer Law, section 25; the ACCC's site is blocked from the build environment), for the owner to approve (in Admin → Agreements on the demo, not current, so nobody is asked to accept it yet).
  - Tests: 542 pgTAP, 544 unit and 266 browser tests, plus the acceptance run.
- **No placement fee** (14/11/2026, the owner's answers to the two questions that followed): businesses can hire our workers directly for free, as the website says, so the agreement's draft 0.4 drops the 15% fee that drafts 0.2 and 0.3 had; and the business late cancellation window is confirmed at 12 hours.
- **The services agreement is approved** (14/11/2026, the owner: "approved"): version 1.0, the wording of draft 0.4 without the draft label, is the one businesses accept. On the demo it took over from the draft, and the demo businesses accepted it; the seed now lets an approved version replace a current draft (never a version an admin published).
- **Worker documents for the owner's OK** (14/11/2026, the owner: "go ahead"):
  - **Casual employment contract, draft 0.2:** checked against Fair Work's current rules, including the casual definition and the employee choice pathway to permanent work (6 months, or 12 while we have fewer than 15 employees; a written reply within 21 days).
  - **Privacy collection notice, draft 0.2, and the privacy page:** checked against the Australian Privacy Principles, with who we get information from, what the law requires, overseas providers (mainly the United States), and a section on the decisions the app makes, which privacy policies must explain from 10 December 2026.
  - **The Casual Employment Information Statement again:** the hourly compliance job emails each worker a link at 6 months, 12 months and every year after (counted from activation), and records each one as proof it was given.
  - Both drafts wait in Admin → Agreements, not current, so nobody is asked to accept them until the owner approves.
  - Tests: 550 pgTAP, 547 unit and 268 browser tests.
- **Worker documents approved** (14/11/2026, the owner: "both approved"): the casual employment contract and the privacy collection notice are version 1.0, and the privacy page is no longer marked draft. The two Fair Work statement pages are 1.0 too, so the demo shows their links. On the demo the new versions took over from the drafts, and demo workers who had accepted an earlier version accepted the new one, so nobody there is sent back through sign-up.

## Next

- **Owner: the warehouse award's pay guide.** Pick-packers, storepersons and forklift drivers come under the Storage Services and Wholesale Award [MA000084]. As with the others:
  1. Download that award's pay guide from the Fair Work Ombudsman website and send it to me.
  2. I'll prepare the rate cards from it, for you to check against the pay guide.
  3. Once you approve them, I'll load the rates, and the three work types can be posted.
- **Owner: stage 2, the accounts.** One service at a time, starting with Twilio, I'll send click-by-click steps; you type the keys into Vercel and GitHub, never into chat. The full list is in `docs/launch.md`: Twilio, Resend, Google Cloud, Cloudflare Turnstile, the ABN Lookup GUID, Supabase Pro with a new `shifta-live` project in Sydney, and Vercel Pro with a second project for the live site. The paid plans, and Twilio's sender name (registered against the company's ABN), wait for the company in January 2027 (owner, 04/11/2026); the free ones can be set up any time.
- **Owner and Claude: work through `docs/launch-questions.md` together** (owner, 04/11/2026: no paid specialists; you decide each one). Each question has my recommendation from the official sources, and the free government services (Fair Work's helpline and Employer Advisory Service, icare, the ATO, the Long Service Corporation) check what needs checking. The recommendations were decided on 14/11/2026 ("yes to all"). The services agreement is approved (14/11/2026). The casual contract and privacy documents are approved too (14/11/2026). Next: the website's terms of use, for your OK, and write the award questions for Fair Work's Employer Advisory Service.
- **Owner: choose the payroll provider** (section 3 of `docs/launch-questions.md`). Employment Hero charges for at least 10 people, about $100 a month, and Xero Payroll only comes with a Xero accounting plan, so my recommendation (04/11/2026) is Payroller's free trial first: the cheapest, with super on payday in every plan. Microkeeper is next if it fails the checks. Then send me its timesheet import template, so the payroll file matches it exactly. Nothing else in Shifta depends on which one.
- **Owner: enter the margin** on the live site: sign in as an admin, open Admin → Settings → Pay and billing, set "Default margin" to the margin you chose, and save. The figure is kept out of the code because the code is public. Until then, charges use the old placeholder margin.
- **Owner: photos of people for the home page.** Either allow the photo library in this environment (steps in our chat, 01/11/2026), and I'll pick free photos of people at work; or send me photos you have the rights to, like your own workers with their permission. Each person in the pictures (Laura, Jack, Priya, Daniel and Mei) then shows a photo instead of initials.
- **Before opening each new state:** enter its public holidays (Admin → Rates → Public holidays) from the state's official list, and check its tickets in Admin → Catalogues → Tickets (who issues them, and whether they expire). The official state websites are blocked from our build environment, so we haven't loaded their holiday dates; we only have NSW's.
- **Owner: before opening another state**, see "The next state after NSW" in `docs/launch-questions.md` (workers' compensation cover there, and a labour hire licence in QLD, VIC, SA and the ACT).
- **Owner: email for support@shifta.com.au.** The site shows it, so mail to it needs to reach you: most domain sellers offer free email forwarding to your own inbox.
- **Try it:** sign up on the live site as a worker or a business, with test details only (in demo mode anyone with the outbox link can see the codes). Codes appear at `/dev/outbox`.
- **Optional, any time:** turn on push notifications (Admin → Settings → Push notifications has the steps).
- **Phase 2:** once you've looked over Phase 1, we'll propose the Phase 2 plan (brief §11: Stripe payments, the Employment Hero Payroll API, automated identity, police check and VEVO checks, in-app messages per shift, recurring jobs, smarter ranking and fuller reports) and wait for your OK before starting.

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
| 30/10/2026 | Replaces the one above: a shift's times are entered and shown in its site's time zone, and our team's screens name the zone when it isn't Sydney's. Everything else, including the Monday-to-Sunday pay week, stays on Sydney time. | Australia-wide: a Perth worker must see 7:00 am for a 7:00 am start in Perth, and payroll needs local times. Pay weeks need one boundary for everyone, so a late Sunday shift in Perth can fall into the next Sydney week's run. |
| 28/10/2026 | Matches are worked out by the server and saved per shift and worker, with the reasons someone can't take a shift. Workers see only their own offers, through database functions that hide the address; businesses see only a count. | Brief §4.4: eligibility is checked when a job is posted, and again when a worker accepts (step 1.8) and 24 hours before (step 1.14). Saved reasons let admins see why someone wasn't offered work. |
| 28/10/2026 | The shift feed lists work soonest first, one card per job. Ranking orders applicants for the business, not the worker's feed. | Workers look for work by day. A multi-day job is one decision ("Accept all days", plan defaults). |
| 28/10/2026 | Workers see the ordinary hourly rate (casual loading included) and an estimate for each shift with penalty rates and any urgent loading, worked out when the job is posted. The rate is fixed when they're booked (step 1.8). | Brief §4.4: workers see hourly pay before they accept. |
| 28/10/2026 | Job photos are shown to workers once they're booked, with the address. | Photos can show the property; the brief keeps location details until confirmation. |
| 28/10/2026 | "Favourites first" lets no one in early when none of the business's favourites can take the work, and doesn't apply to urgent call-outs. | Holding work back for nobody only delays it. Urgent call-outs go to every eligible worker nearby (brief §4.3). |
| 28/10/2026 | Bookings copy the pay and bill worked out when the job was posted, rather than pricing again at booking. | Both sides get the terms they were shown: the business its estimate, the worker the pay in their offer. Later rate changes never touch existing bookings (brief §4.8). |
| 28/10/2026 | A business picks an applicant for every day they applied for, in one tap; there's no picking day by day. | One main action per screen. A worker who can only do some days applies for those days. |
| 28/10/2026 | When a shift fills, the other applicants are marked "filled by others" rather than kept on a waiting list. | Workers know where they stand and can plan. Re-offers when someone drops out come with step 1.9. |
| 28/10/2026 | Businesses see an applicant's first name and initial; the full name and mobile number once they're booked. | Brief §4.4 ("preferred name") and the plan's contact rule ("the business sees the worker's mobile" after confirmation). |
| 28/10/2026 | Until push notifications arrive (step 1.14), workers are texted when a business books them and for reminders; businesses get emails. Workers who accept "First in" aren't texted: they see it on screen. | Brief §5 reserves texts for login codes and urgent work, but workers need these messages and push isn't built yet. See the open question about texts. |
| 28/10/2026 | Until clock-in arrives (step 1.10), no-shows are reported by the business; then they're also flagged automatically after 30 minutes without a clock-in. | Plan default: the supervisor confirms a no-show or arrival, otherwise admin decides. |
| 28/10/2026 | A booked shift counts as worked once it's over and no one reported a no-show, until timesheets arrive (step 1.11). | Reliability and "shifts done" need something to count from the start. |
| 28/10/2026 | Businesses cancel a whole shift or job; taking one booked worker off a shift isn't offered yet. | Keeps cancelling simple. Each booking still gets its own charge and message. |
| 28/10/2026 | A late business cancellation is charged as hours at each booking's bill rate, recorded on the booking. | Brief §4.5: "charged per policy". The hours are a setting; invoices (step 1.13) add the line. |
| 28/10/2026 | Admins are flagged about every no-show and suspension in a new list, shown in the admin queues from step 1.15. | Brief §4.5: suspension is "pending admin review". |
| 28/10/2026 | Clocking in opens two hours before a shift and closes twelve hours after it ends. A phone's stated accuracy (up to 100 m) counts in the worker's favour. | Allows for early arrivals and late clock-outs without signal; GPS indoors is rough. |
| 28/10/2026 | Clock-ins and outs always use a fresh location, not one the phone cached earlier. | A cached location could be from before they arrived. |
| 28/10/2026 | Safety reports are seen by the reporter and admins only; admins follow up with the business. | Workers can raise issues without the business seeing who reported them. |
| 28/10/2026 | Supervisors adjust times and record breaks on the timesheet (step 1.11) rather than on the day. | One place for the hours that get paid and billed. |
| 28/10/2026 | The most specific bill rule wins: the business's rule for the category, then its rule for all categories, then the category's standard rule, then the default margin. Only one rule per business, category and start date. | Plan: a margin with per-category and per-business overrides. The pay and bill engine (step 1.5) always finds exactly one rule. |
| 28/10/2026 | Paid time starts at the rostered start even if the worker clocks in early, and ends at the clock-out. The business can change either. | Arriving early isn't working early unless the business asked. A late finish is paid as clocked, so staying back isn't lost; the business sees it before approving. See the open question. |
| 28/10/2026 | With no clock-out an hour after the shift, the timesheet uses the rostered finish. A later clock-out still fills it in until the business looks at it. With no clock-in at all, there's no timesheet: the business adds the hours or reports a no-show. | Brief §4.6: a timesheet at clock-out. Hours with nothing recorded aren't paid automatically; the possible no-show flag is already with admins. |
| 28/10/2026 | Changing hours approves them in one step, with a note we text to the worker. A query from either side goes to admins, and those hours aren't paid or charged until it's settled. Workers can query approved hours once; our team's decision then stands. | Brief §4.6: the business approves or disputes; disputes go to the admin queue with both sides' notes. One query each keeps it from going round in circles. |
| 28/10/2026 | Approved hours are costed when they're approved, with the rates kept on the booking, and saved. Overtime and night hours follow today's settings. | Brief §4.8. The weekly run (step 1.13) adds up saved costs, and workers and businesses see their side straight away. |
| 28/10/2026 | A booking counts towards reliability once its hours are in (replacing the step 1.9 rule). Hours starting after the grace period count as a late arrival. | Reliability now follows what was recorded, not just the roster. |
| 28/10/2026 | A no-show can't be reported for someone who clocked in at the site, whose arrival the business confirmed, or whose hours are in: query the hours instead. A clock-in from somewhere else can still be reported. | A no-show and paid hours for the same shift would contradict each other. |
| 28/10/2026 | "Hours ready to approve" and "approved automatically" emails go to whoever posted the job, one email per run of the timesheets job. | Fewer emails when a crew clocks out together. Step 1.14 adds preferences and push. |
| 28/10/2026 | Ratings are given once per booking, after the hours are approved, and can't be changed. | Plan: "rater, once, after approval". It keeps averages honest. |
| 28/10/2026 | Anyone at the business who can see the job rates the worker, supervisors included. Only owners and managers add favourites or block workers. | Supervisors approve hours at their sites (brief §2); favourites and blocks apply to the whole account. |
| 28/10/2026 | Neither side sees what the other wrote or tagged: workers see a business's average across all its sites, businesses see each worker's average. | Brief §4.7 and the plan default (not per site). |
| 28/10/2026 | Blocking a worker stops new offers and takes them off the favourites, but keeps bookings they already have. | Cancelling has its own rules and charges (step 1.9); the business can still cancel. |
| 28/10/2026 | Each week is run once, and weeks are run in order. A run takes everything owed from that week or before, so hours approved late go in the next run. | Nothing is paid twice or missed, and a missed week is caught up by the next run. |
| 28/10/2026 | The weekly run goes ahead by itself on the run day, and an admin can run the week early from Pay runs once it's over. It needs our legal name, ABN and bank account in Settings first. | Brief §4.8 and §8: a scheduled weekly run, which admins manage. Every tax invoice needs our name and ABN, and businesses need to know where to pay. |
| 28/10/2026 | Payroll and invoice lines are one table: each line is one booking, with the pay and the charge. Businesses see only the charge and what it's for, through a database function. | The plan listed separate invoice lines. One line per booking means the payroll file and the invoices always agree. |
| 28/10/2026 | A late cancellation is charged at the rate that would have covered most of the shift. A worker who had arrived is paid, and the business charged, at least the minimum engagement. | Plan question 8 and brief §4.5. A late Saturday cancellation is charged at the Saturday rate. |
| 28/10/2026 | GST is worked out once on each invoice's total. Invoices are numbered INV-1001 onwards (the prefix is a setting); a run that fails part way can leave a gap in the numbers. | The usual way to show GST on a tax invoice. Numbers only have to identify each invoice, not run without gaps. |
| 28/10/2026 | An invoice is due on the business's own payment terms if it has them, otherwise the setting (14 days). | Account terms are approved per business (step 1.4). |
| 28/10/2026 | Invoices are marked paid by hand, with the date and the bank's reference, and can be marked unpaid again. | v1 is bank transfer on account terms; Stripe arrives in Phase 2. Undo covers a payment matched to the wrong invoice. |
| 28/10/2026 | Invoice PDFs use the PDF format's built-in Helvetica font, so no font files are bundled. Letters it can't show are written without their accents (Nguyễn becomes Nguyen). | Smaller and simpler. Names keep their accents on screen and in emails. |
| 28/10/2026 | The payroll file lists people by legal name ("Last, First") with their payroll employee ID, and adds a notes column for minimum engagement top-ups and paid cancellations. | Payroll works from legal names. The notes explain pay that isn't just the hours worked. |
| 28/10/2026 | Workers get push notifications in the installed app once they turn them on, and texts otherwise. Urgent call-outs come by text as well. Businesses and our team get emails. | Brief §5 channels. Push is free; texts cost a few cents each once Twilio is on. |
| 28/10/2026 | Every message is kept and listed on the worker's Notifications page, including ones they've turned off (those just don't buzz or text). | One place to look back at what we've said. |
| 28/10/2026 | Messages about bookings and cancellations, accounts, tickets and visas, safety and compliance can't be turned off. Workers choose shift reminders and timesheet messages; businesses choose applicants, on the day and timesheet emails. Urgent call-outs stay on the Availability page. | Brief §5: per-user preferences, except critical messages. |
| 28/10/2026 | Quiet hours hold every non-urgent message, whatever the channel. A booking or a worker cancelling a shift that starts within a day counts as urgent. Setting both quiet hours times the same turns them off. | Brief §5. Someone booked tonight for tomorrow morning needs to know tonight. |
| 28/10/2026 | Message words live in code, and admins' changes are saved separately, so "Use the standard wording" puts them back. In the app and push notifications the sentence with the link is left out, as tapping opens it. | Brief §5: templates editable by admin. |
| 28/10/2026 | Push keys are made on Admin → Settings and added to Vercel by the owner. They're never stored in the database or the code. | Keeps the private key with the hosting secrets. Web push is free and needs no account. |
| 28/10/2026 | A booked shift is flagged as soon as we know it won't pass on the day (say a ticket it needs expires first), not only the day before. The checks look at the worker's status and papers, not travel or availability. | Brief §4.4 and §4.9. Earlier warning gives the worker time to renew and the business time to rebook. |
| 28/10/2026 | An expired visa is marked expired, so the worker can enter their new one for a VEVO check. A ticket with a renewal already added gets no warnings. | Brief §4.9. Nobody is nagged about something they've already done. |
| 28/10/2026 | The expiry checks run every hour, not nightly. Each warning and expiry still goes once, by date. | Brief §4.4 checks bookings again 24 hours before the start; running hourly checks each one close to that point. |
| 28/10/2026 | Our team can take a worker off a booked shift. It doesn't count against their reliability, the business isn't charged, and the shift is offered to others. The worker is told why; the business is told without the reason. | The plan: admins decide about bookings at risk and the bookings of workers on hold. The reason may be about the worker's papers, which businesses never see. |
| 28/10/2026 | An excused no-show is set aside like a booking our team cancelled, so it no longer counts towards reliability or a hold. Who reported it, and when, stays on record. | Brief §4.5: no-shows are reviewed by admin. |
| 29/10/2026 | Navy (#1b365d) with a soft hi-vis orange accent, Figtree, and an "m." logo, replacing the green. Every colour pair still meets WCAG 2.1 AA. | The owner asked for a gentler, friendlier look in a darker blue, nothing that looks generated. Navy and orange echo workwear and hi-vis; the home page shows a real shift rather than stock art. |
| 30/10/2026 | A lighter blue (#1d68cf) with deep blue (#123a6e) for headlines and dark bands. Menus are always on show: sidebars from tablet width, and on phones bottom tabs plus a visible row of the other pages. The public site is full screen. | The owner asked for a friendlier, lighter blue, menus that are always open when signed in, and a full-screen site with a big brand presence, like Sidekicker. A sidebar can't stay open on a phone, so phones show every page as tabs or a row instead of a menu button. |
| 30/10/2026 | The hosted project's sign-in settings live in their own file, `deploy/muster-dev/supabase/config.toml`, not the local `supabase/config.toml`. | `supabase config push` changes every setting the file declares. The local file also sets database pool sizes, storage and test-friendly rate limits that the hosted project shouldn't take. |
| 30/10/2026 | Scheduled jobs run on Supabase's scheduler (pg_cron), which calls the site with pg_net. The site's address and `CRON_SECRET` are in Vault, copied there from GitHub by the database workflow. | Free, and runs every 10 minutes (Vercel's free plan runs jobs once a day; GitHub's scheduler is often late). Nobody has to handle the secret. Supabase's pg_net lets the API roles call its functions, which our database role can't take back; they're still out of reach of the website and API, as on every Supabase project with webhooks. |
| 30/10/2026 | The business is **Shifta** (shifta.com.au). Slogan: "Staff today, not someday." The repository and the Supabase project keep the working name Muster. | The owner's choice: short, memorable, a made-up word they can own on Google and as a trade mark. Renaming the infrastructure would only add risk. |
| 30/10/2026 | Australia-wide: every state and territory is in the platform, but we take work only in states an admin has opened (NSW to start), and a state that requires a labour hire licence also needs a current one on file. The website shows the other states as coming soon. | The owner wants national reach like Sidekicker. Opening a state needs things the app can't check for itself: workers' compensation cover there, and a labour hire licence in QLD, VIC, SA and the ACT. The switch lets the website and sign-ups go national now, while work starts only where we're covered. |
| 30/10/2026 | Every industry is accepted, not just restoration and cleaning (owner's decision, a change to the brief; noted at the top of BRIEF.md). Industries are an admin-managed catalogue that groups the work types. | The owner wants to scale now. Industries in the database let admins add new ones without code changes, and give each one a page on the website. |
| 31/10/2026 | A worker's bio (asked at sign-up, up to 500 characters) is what businesses see about them, and an application can carry a note of up to 300 characters. Neither can hold a phone number, email address or link; the app and the database (`worker_words_ok()`) check the same rules. | The owner wants workers to be able to stand out. Keeping contact details out means businesses reach workers through us, and workers' details stay private. The bio already existed, so it became the "about me" rather than adding a second one. |
| 31/10/2026 | Badges are plain words, not tiers: Your favourite, Worked with you (n times), Top rated (4.7 stars or more from at least 5 ratings), Very reliable (95% or more over at least 10 shifts), 5+ years' experience (as the worker told us) and New to Shifta (fewer than 3 shifts). The thresholds are in `src/domain/worker-badges.ts`. | They say what they mean, so a business can trust them at a glance; tiers like Gold and Silver need explaining. The owner can ask for different thresholds. |
| 31/10/2026 | Call-outs pay workers 20% more per hour (owner's decision) and the charge stays 20% more, so our margin on them is the usual percentage. They go out at any hour. If nobody accepts within 20 minutes (`callout_alert_minutes`), the business and every admin are told, once. Only open work starting within 48 hours, with no applicants waiting to be picked, can become a call-out; people already booked keep their rates. | The owner set the pay, the timing and the alert. The 48-hour limit keeps the call-out rate to short-notice work; applicants come first so nobody who applied is left hanging. |
| 31/10/2026 | Everyone signs in and up by email, with a code or the emailed link; there's no sign-in by mobile (owner's decision). Workers still add and confirm a mobile number in onboarding. Codes by text stay switched on in Supabase, because confirming a mobile uses them. | The owner's choice: one way in for everyone. We still text call-outs and reminders, so we still need a confirmed mobile. |
| 31/10/2026 | The website is about Sydney only for now: the Locations and city pages are removed, and the home page and footer don't mention other states (owner's decision). The platform keeps every state, and the admin switch to open them. | We're launching in Sydney, and talking about other states would promise what we can't do yet. The city pages can come back from the history when we open another state. |
| 31/10/2026 | The home page's pictures of the app use example people and figures that match our current placeholder rates and settings: $33.13 an hour for a restoration labourer on a weekday, about $159 for a four-hour call-out. | Examples a worker or business will recognise in the app. When the real rates are set, we update the examples to match (the call-out figure already follows the call-out setting). |
| 01/11/2026 | Pictures of the app on the website carry no "Example" labels (owner's decision). The footer says the people and details in them are illustrative, and there are still no quoted reviews, client logos or made-up numbers about us. | The owner wants the site to look complete, like Sidekicker's. A line in the footer keeps us honest without labelling every picture: the ratings and names show how the app works, not real reviews (Australian Consumer Law treats fake reviews as misleading). |
| 01/11/2026 | People's photos go on the site only when we have the rights to them: free photo libraries (Unsplash) for people at work, and ideally our own workers, with their permission, once we have them. | Free libraries don't get model releases, so using their faces as named workers is a grey area; our own workers' photos are the most credible. |
| 01/11/2026 | Sign-up asks only what's needed to start; the checks the law needs (photo ID, right to work, tickets, the employment paperwork) still come before a worker's first shift, and every business is still approved before its first shift goes out (owner's decisions). | The owner wants sign-up quicker than Sidekicker's. People commit once they've seen what's waiting for them; the checks can't be skipped because we're the employer. |
| 01/11/2026 | Workers we haven't checked yet see open shifts near them in the work they chose, with the pay, but not the business or the address, and nobody is told about them (owner's decision: yes). | Shows there's real work waiting, without handing our clients' names to anyone with an email address. Matching and messages stay for checked workers. |
| 01/11/2026 | A business can submit with no site; it adds its first site while setting up its first shift. The billing contact starts as the owner. | Fewer screens before a business is with our team. A site is only needed to post work. |
| 01/11/2026 | What people type on the register form is kept with their account until the code is in, then read with `signUpDetails()` and checked again before use. | The details can't be saved anywhere else until the email is confirmed, and people can change their own account details. |
| 01/11/2026 | The logo is the lower-case wordmark with a hi-vis dot on the i; the S icon is only for app and browser-tab icons (owner's choice). | The owner picked it from seven ideas: the name is what people need to remember, and the icon still works where a square is needed. |
| 01/11/2026 | The main address is www.shifta.com.au, and shifta.com.au redirects to it (Vercel's recommended setup, the owner's OK). Sign-in links and the scheduled jobs use the www address. | The scheduled jobs post to the site and must reach an address that doesn't redirect. People can type either. |
| 01/11/2026 | While the site is in demo mode it asks search engines not to list it. | Anyone can read sign-in codes in the demo outbox, so the demo shouldn't be found by searching. Listing starts when demo mode goes off at launch. |
| 01/11/2026 | Workers are paid each award's casual rate plus 50c an hour; weekend, holiday, overtime and shift rates use the same base, so they're above the award too (owner's decision; checked by the owner's accountant). | Slightly above the minimum helps us attract workers, and one base per card keeps every rate consistent. |
| 01/11/2026 | The margin is entered in Admin → Settings, and isn't written in the code or these notes. | The repository is public. |
| 01/11/2026 | Restoration roles, pack-out, strip-out and builders cleaning use the Cleaning Services Award; general labourers the building award's commercial rate (CW1, level a); removalist offsiders road transport grade 1 (owner and accountant). | As the owner's restoration employer does, and Fair Work's guidance for removalist assistants. The commercial building rate covers us on any site. |
| 01/11/2026 | An award's overtime and shift rules are set on each rate card (admin-set data, not code), and each hour is paid at the highest rate that applies. Bookings made before keep the rules they were priced with. | Brief §4.8: no award rules in code; a payroll professional checks the cards. |
| 01/11/2026 | General labourers and removalist offsiders are treated as day workers: weekday hours outside ordinary hours are paid as overtime, not shift rates. | The awards' shift rates are for workers on shift rosters, which we don't run, and overtime pays more. |
| 01/11/2026 | The pictures of the app on the website take a restoration labourer's pay from the current rate card (replacing the 31/10/2026 decision to update them by hand). | They stay right when the rates change each July. |
| 02/11/2026 | A worker's hours with us add up across the day and week, in the order their shifts were booked; the business whose booking takes them past a limit pays the overtime (owner's choice). | We employ them for every shift. Booking order means the business charged is the one we could warn before it booked. |
| 02/11/2026 | First-in shifts and call-outs aren't taken by workers their other shifts would put into overtime, unless the business ticks "Let workers on overtime take this shift" when posting. Businesses that pick see the overtime on each applicant. | So a business never gets overtime it didn't see coming (owner: "the business needs to understand the overtime beforehand"). |
| 02/11/2026 | The weekly limit is 38 ordinary hours, Monday to Sunday, a setting; hours already overtime under the daily limit don't count twice. | The awards' weekly hours for casuals, to be confirmed by the accountant with the daily ones. |
| 02/11/2026 | We offer four industries and eight work types: general labourers, commercial and builders cleaners, restoration technicians, pick-packers, storepersons, forklift drivers and removalist offsiders. The rest are archived, never deleted (owner's request). | A smaller offer to launch and build from, centred on the owner's restoration and cleaning contacts. |
| 02/11/2026 | Restoration technician covers all restoration work: it needs a White Card, and a business asks for IICRC tickets on the jobs that need them. Workers who chose the other restoration roles have it added; trades assistants have general labourer added. | The owner: restoration technician "covers everything with resto". Requiring the WRT on every job would rule out strip-out and pack-out workers. |
| 02/11/2026 | A work type can be posted only once it has a rate card; placeholder rates of work types without checked ones are archived. Work waiting for rates shows as "coming soon" on the website and greyed out when posting. | Nothing priced below the award, and businesses find out before filling in a shift rather than at the last step. |
| 03/11/2026 | Invoices are issued and tracked in Shifta, and Xero isn't part of the process; Employment Hero pays the workers (owner's choice). | One place for shifts, hours and invoices. The accountant works from Shifta's and Employment Hero's reports and the bank statements. |
| 03/11/2026 | The live site runs next to the demo, with its own Supabase and Vercel projects, real services and no demo data; the demo moves to demo.shifta.com.au (owner: "keep the demo"). The live site changes only when the owner says "release". | Changes are tried on the demo first, and real people's details never mix with demo data. |
| 03/11/2026 | Texts through Twilio (owner's choice), email through Resend, addresses through Google Maps Places, and Cloudflare Turnstile as the bot check. | Twilio registers the sender names Australian networks now require; Resend and Turnstile are simple and cheap or free; Google's addresses are the most complete. Each sits behind an adapter, so it can be swapped. |
| 03/11/2026 | An invoice that's gone out is never changed: a credit note corrects it, with its share of the GST, and an invoice's credit notes never add up to more than it. | That's how GST corrections work (adjustment notes); changing a sent invoice would leave the business's books and ours out of step. |
| 03/11/2026 | The sales report counts sales by the day invoices and credit notes were issued, and payments by the day an invoice was marked paid, for what was owed that day. | It covers both ways of doing the BAS (accruals and cash); the accountant chooses. |
| 03/11/2026 | On the live site, Supabase hands every sign-in code to our app, which sends sign-in codes by email and texts only to confirm a new Australian mobile, at most five a day per person; nobody signs in by text or changes their email address there (our security review). | Supabase's bot check doesn't cover a signed-in person's own changes, which could otherwise send texts and emails anywhere, at our cost. |
| 03/11/2026 | Overtime is priced without super, and each rate card lists the rate types its award makes overtime (owner's OK). | Super is only owed on ordinary time earnings, so adding it to overtime overcharged by about 11%; other agencies price it this way. |
| 03/11/2026 | Allowances live on rate cards as data, paid on every shift or for overtime past the booked finish, and are charged with on-costs but no super, at the margin (owner's OK). | Awards require them (general labourers' fares and travel, cleaners' meal allowance); data keeps them out of code and lets the accountant check them. Overtime past the booked finish stands for overtime nobody asked for the day before. |
| 03/11/2026 | The services agreement's next draft adds a placement fee for hiring our workers directly: 15% of the first year's pay within 180 days (owner's OK), for the lawyer to finalise. The fee is in the agreement's text, not a setting. | It protects the business from clients hiring away workers they found through us. A setting could drift from what each business signed. |
| 03/11/2026 | Every question to settle before launch lives in `docs/launch-questions.md`, grouped by who answers it, and each session reads it at the start (owner's request). | One list to take to the accountant, payroll provider, lawyer and insurer, kept current as answers come in, instead of questions scattered through chat and notes. |
| 04/11/2026 | No paid accountant, lawyer, insurance broker or payroll professional: the owner decides each question, with our research from the official sources and a recommendation for each, and uses the free government services where a question needs checking. Documents are checked against the official guides and approved by the owner (owner's choice). | The owner's budget. Fair Work's Employer Advisory Service gives small businesses free written advice on award pay, and following it in good faith protects against penalties; icare, the ATO and the Long Service Corporation answer their own questions for free. |
| 04/11/2026 | The business will be a company, Shifta Pty Ltd, registered with ASIC and for GST and PAYG withholding in January 2027, when the owner is back from Brazil. | The owner's plan; a company keeps the business's risks off the owner personally. Nothing trades, and no paid account is opened, until it exists. |
| 04/11/2026 | Restoration labourer is back at the cleaning award's level 1, beside restoration technicians at level 2 (owner's OK). | Another agency bills restoration labouring at level 1, so the technician rate alone would cost restoration businesses more. |
| 04/11/2026 | Invoices show a row for each rate (hours, rate, amount), with the job number, the business's PO or reference number, the site, and the award and level; job numbers are an identity column nobody sets or changes, and the PO can change any time until the hours are invoiced (owner's OK). | Restoration and cleaning businesses get this from other agencies and check invoices against it; a PO is often needed for payment. Lines keep what they were invoiced with, so a later change never alters a sent invoice. |
| 08/11/2026 | Shifta gets App Store and Google Play apps around launch (changes brief §10), made by wrapping the existing app with the phone's own notifications, location and camera, rather than building separate apps. | Workers look for work in the app stores and trust apps there, notifications reach iPhones without the home-screen step, and app notifications are free where texts aren't. Wrapping keeps one app to look after, and most changes reach it without a store review. |
| 14/11/2026 | GST on a cash basis, and the BAS quarterly, lodged by the owner in the ATO's online services (owner's choice). | GST is paid only once businesses have paid us, and quarterly is the small business default; Shifta's Sales and GST page gives the sales figures. |
| 14/11/2026 | Payroll tax is 0% in prices until wages near NSW's threshold ($1.2 million a year, a setting); the admin dashboard warns at 80% of it over 12 months, or of its monthly share over 30 days (owner's choice). | Prices aren't higher than they need to be, and the warning leaves time to register with Revenue NSW and add the on-cost. |
| 14/11/2026 | Pay and invoices run on Wednesday, and businesses pay within 7 days (owner's choice). | Businesses have 48 hours to approve hours, so Wednesday's run catches the weekend; 7 days shortens the time we pay workers before businesses pay us. |
| 14/11/2026 | A worker who hadn't arrived is paid the 3 hours the business is charged for cancelling late (owner's choice). | The business pays for it, and workers who lose a shift late stay with us. |
| 14/11/2026 | An allowance can be paid once a day, with the first shift booked that day; the fares and travel allowance is (owner's choice). | The building award pays it for each day worked. Booking order is how a worker's hours are shared between businesses for overtime too. |
| 14/11/2026 | A work type can carry a long service levy, an on-cost on ordinary pay that's left off overtime and allowances like super: 1% for commercial and builders cleaners (owner's choice). | NSW's contract cleaning scheme levies 1% of cleaners' ordinary wages. Whether it covers restoration work is asked when registering. |
| 14/11/2026 | New workers get an email with links to the Fair Work Information Statement and Casual Employment Information Statement after the paperwork step (owner's choice). | They keep their own copy, not only what they read in the app. |
| 14/11/2026 | Kept as they are: texts for workers without the app, paid time from the rostered start, deleting ID photos once checked, "usually within two business days", the public code and the plan's 10 answers. Later: the trade mark, extra insurance and changes to posted jobs. Marketing messages only with opt-in. | The owner's "yes to all" to our recommendations in `docs/launch-questions.md`. |
| 14/11/2026 | The services agreement's draft 0.3 adds 7-day terms, interest and collection costs on late payments, vehicles and forklifts only on written request with the business's insurance, the business's supervision and responsibility for damage and losses, 30 days' notice of rate changes (with the right to end the agreement), and checks on request at the business's cost (owner's choice). | Each is checked against the ACCC's guide to unfair contract terms before the owner approves the draft. |
| 14/11/2026 | No placement fee: businesses can hire our workers directly for free (owner's choice), replacing the 15% fee planned on 03/11/2026; the agreement's draft 0.4 drops it. | It keeps the website's promise ("Offer them a permanent job. No placement fee and no agency contract"), a selling point against agencies. |
| 14/11/2026 | A business cancelling with less than 12 hours' notice is charged the 3 hours (owner's choice; no longer a placeholder setting). | Confirmed with the draft agreement, which states it. |
| 14/11/2026 | The owner approved the services agreement as version 1.0 (draft 0.4's wording). The seed makes an approved version current in place of a current draft, never over one an admin published, and demo businesses accept the current version. | The approved wording is what businesses sign, on the demo too, without an admin step; the company's name and ABN are added once it's registered. |
| 14/11/2026 | Casuals are emailed the Casual Employment Information Statement again at 6 months, 12 months and every year after, from activation, and each one is recorded (owner's "go ahead"). | The law's dates for an employer with 15 or more employees, which we'll soon be; giving it more often does no harm while we're smaller. Fair Work accepts a link by email, and the record proves it was given. |
| 14/11/2026 | The owner approved the casual employment contract and the privacy collection notice and policy (version 1.0). Demo workers who accepted an earlier version of a document accept its current version in the seed; real workers are asked again. | A new version would otherwise send every demo worker back through sign-up and paperwork; real people must see and accept what they sign. |
| 28/10/2026 | The acceptance run moves the booked week back in time, and the owners enter the rostered hours, instead of waiting a week for workers to clock in and out. | Clocking in and out uses the real time and the phone's location, so a run can't do it for last week. The on-the-day tests cover clocking and the timesheets it makes. Everything else in the run is done in the app. |

## Open questions for the owner

All of them are in `docs/launch-questions.md` (03/11/2026), grouped by who can answer them: the accountant, the payroll provider, the lawyer, the insurance broker, and the owner's own decisions. Answered ones are ticked there and recorded under Decisions.

## Before launch (not now)

**Owner, in order** (05/11/2026; no paid specialists, so we work each out together in `docs/launch-questions.md`, and the owner decides):

_Now, from anywhere (free, no company needed):_

1. **A director ID** (free, online through the ABRS with myID): a new director needs one before the company is registered.
2. **Check "Shifta Pty Ltd" is free** on ASIC's register (a free search).
3. ~~**Decide the recommendations** in `docs/launch-questions.md`~~: done 14/11/2026 ("yes to all").
4. **The warehouse award's pay guide**, if warehouse work is to launch (see Next).
5. **Small things:** a contact phone number (or email only), forwarding for support@shifta.com.au, and photos of people (optional).
6. **Free accounts, any time:** Cloudflare Turnstile, and the ABN Lookup GUID if it hasn't come.

Meanwhile we check each document against the official guides for the owner's OK, and write the award questions for Fair Work's Employer Advisory Service.

_January 2027, once back from Brazil, in this order:_

1. **Register Shifta Pty Ltd** with ASIC. Then we add its name and ABN to the business agreement, the casual contract and the privacy documents (version 1.1 of each).
2. **The company's ABN, GST (cash basis, decided 14/11/2026) and PAYG withholding:** free, one online application.
3. **A business bank account,** and cash for 2–3 weeks of wages.
4. **Workers' compensation from icare** (required by law before anyone works); its rate for each work type goes into Admin.
5. **Public liability:** two or three quotes for labour hire, $20 million cover.
6. **The Long Service Corporation:** register for the contract cleaning scheme (and ask whether it covers restoration work), and the building scheme if labourers will work on building sites.
7. **Payroll:** choose the provider (Payroller's free trial first), set it up, and send us its timesheet import template.
8. **The accounts, one at a time with our steps:** Twilio (the sender name, with the ABN), Resend, Google Cloud, Supabase Pro with `shifta-live`, Vercel Pro with the live project, and the locked GitHub environment (`docs/launch.md`).
9. **The margin,** worked out together from the quotes and costs, then the Fair Work enquiry about the award questions.
10. **The store apps** (owner, 08/11/2026), with our steps for each:
    - a free D-U-N-S number for Shifta Pty Ltd, which both stores ask a business for (about a week);
    - Apple's developer program as a business (US$99 a year), and a Google Play business account (US$25 once; a business account skips Google's 14-day test with 12 testers);
    - a free Firebase project for the apps' notifications;
    - the Apple, Google Play and Firebase access keys, added to GitHub and Vercel, never sent in chat;
    - the store agreements, the test versions on the owner's phone, and the final submit.

    We build the iPhone and Android apps around the existing one, with automatic builds on GitHub's Mac machines (free while the code is public), the store listings, privacy and content-rating answers, and a sign-in for the stores' reviewers.

_Launch:_

1. **"Release":** we build the live site; the owner moves the address in Vercel (our steps).
2. **Admin setup on the live site:** sign in, set up the authenticator app, then company and bank details, the margin, on-costs (workers' compensation rates), and the approved documents.
3. **A run-through** with the owner's own email and mobile.
4. **Google Search Console** (free): add www.shifta.com.au and its sitemap, so Google lists the live site soon after launch. The demo asks search engines not to list it, so it never competes.
5. **A test week** with one or two friendly businesses and a few workers, through to workers paid and an invoice paid.

**Details and our part:**

- Ready (03/11/2026): the live site's own Supabase project and sign-in settings, the release workflow, the real setup without demo data, and making the first admin; and Resend, Twilio, Google Maps and Turnstile, each waiting for its account and keys. The steps are in `docs/launch.md`.
- Upgrade to Vercel Pro and Supabase Pro (commercial use, backups, no pausing). Ask the owner first.
- Check the privacy policy, terms of use, casual employment contract and information statements against the official guides, for the owner to approve (owner, 04/11/2026: no lawyer); the labour hire services agreement is approved (14/11/2026). The public pages are marked as drafts until then.
- Set real pay rates and minimum engagements for any work type before we offer it. The focus work types have real rates (01/11/2026), apart from the three warehouse ones waiting for the Storage Services and Wholesale Award's; the archived ones (02/11/2026) span other awards (for example Hospitality, General Retail, Clerks and Manufacturing) and have none until they come back.
- Before we pass about 1,000 active workers, or 1,000 shifts in a week: the matching engine and the weekly pay run read at most 1,000 rows at a time, so they need to read in pages, as the expiry checks already do.

## Owner setup checklist

- [x] Supabase organisation "Muster" and project `muster-dev` (Sydney region).
- [x] GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`, `SUPABASE_SECRET_KEY`.
- [ ] ABN Lookup GUID requested at abr.business.gov.au. When it arrives, add `ABN_LOOKUP_GUID` to Vercel and to the cloud environment's variables.
- [x] Vercel project imported from GitHub, environment variables added (steps in README). Live at https://muster-two-mauve.vercel.app.
- [x] `CRON_SECRET` made, added to Vercel and as a GitHub Actions secret (the same value). Scheduled jobs on since 30/10/2026.
- [x] Domain shifta.com.au bought (30/10/2026).
- [x] Domain connected in Vercel (01/11/2026): www.shifta.com.au is the main address and shifta.com.au leads to it. The DNS records are at VentraIP: an A record for shifta.com.au and a CNAME for www, as Vercel shows them; the NS records stay VentraIP's.
- [ ] Email forwarding for support@shifta.com.au to your own inbox.
- [x] Keep the GitHub repository public (owner, 14/11/2026). Anyone can read the code and BRIEF.md, so nothing secret goes in them.
- [ ] Optional: allow `ui.shadcn.com` and `abr.business.gov.au` in the cloud environment's network settings, so the shadcn CLI and the live ABN lookup work from the build container.
