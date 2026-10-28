# Progress

_Last updated: 28/10/2026_

## Status

**Phase 0: Foundations, complete** (28/10/2026). CI is green on GitHub, and `muster-dev` has the schema and demo data, deployed by the database workflow. Waiting on the owner to connect Vercel for preview links.

**Phase 1: Run real shifts, in progress** (steps 1.1 to 1.14 done). The plan was approved with Phase 0. The 10 open questions in `docs/plan.md` use our recommendations unless the owner changes them.

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
  - **Reminders:** the day before and two hours before, by text, never twice. They run when the scheduler calls `/api/cron/reminders` with the `CRON_SECRET`; the scheduler is set up once the site has an address (see Next).
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

- **1.15 The rest of the admin console** (Phase 1, in progress):
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
  - Filtered lists keep their filters in the page address, so they can be bookmarked or shared with another admin.

## Next

- **Owner:** set up Vercel (steps in the README), then send the site address.
- **Then:** push the Supabase sign-in settings (allowed redirect URLs, demo login-code hooks) to `muster-dev` with `supabase config push`, so code sign-in works on the preview. Until then, use "Sign in as".
- **Once the site has an address:** schedule the jobs with Supabase's free scheduler (pg_cron), calling `/api/cron/<job>` with the `CRON_SECRET` (Vercel's free plan only runs scheduled jobs once a day):
  - every 10 minutes: `reminders`, `finish-shifts`, `attendance`, `timesheets` and `notifications`
  - hourly: `compliance`
  - once a day, early morning: `pay-run` (it only runs on the run day)
- **Optional, any time:** turn on push notifications (Admin → Settings → Push notifications has the steps).
- **Phase 1, step 1.15:** the rest of the admin console:
  - reports and the audit log viewer

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

## Open questions for the owner

- **The 10 questions in `docs/plan.md`.** We're using the recommendations unless the owner says otherwise. They must be settled before Phase 1 starts.
- **How quickly will new workers be checked?** The app tells workers "usually within two business days". Change it if that's not realistic.
- **Employment Hero timesheet import template.** The payroll file uses draft columns until we have it.
- **Company details for tax invoices** (legal name, ABN, address, contact and bank account). Enter them in Settings → Pay and billing; the demo shows made-up ones.
- **The weekly run day.** It's Monday for now. Businesses have 48 hours to approve hours, so weekend shifts are usually still waiting on Monday and get paid a week later. Running on Wednesday would catch them. Which day suits you?
- **Texts for bookings and reminders.** The brief keeps texts for login codes and urgent work. Workers who install the app and turn notifications on now get bookings and reminders there instead. Workers who haven't still get them by text: should they? Each text costs a few cents once Twilio is set up.
- **Late cancellations by a business.** Each booking is charged 3 hours for now (a placeholder setting). Should the worker also be paid those hours if they hadn't arrived yet? (Workers who have arrived are always paid at least the minimum engagement, brief §4.5.) The setting is off for now.
- **Early starts and late finishes.** Paid time starts at the rostered start even if a worker clocks in early, and a late finish is paid as clocked unless the business changes it. Is that the rule you want, or should both follow the roster unless the business approves extra time?
- **Changing a posted job.** For now a business can't edit a job once it's posted, because workers decide on what they were shown. From step 1.9 they'll be able to cancel and post again. Should they be able to change small things, like the instructions or who to report to, after posting?

## Before launch (not now)

- Set `DEMO_MODE=false` in production; seed demo data into the dev project only.
- Create the first real admin account (sign in once, then set its role to admin in the database). Every other admin can be managed from the app after that.
- Point the Supabase Auth SMS and email hooks at our adapters (Twilio, Resend). These are paid services: ask the owner first.
- Turn on CAPTCHA for code requests (Cloudflare Turnstile is free) to stop SMS-pumping fraud once real texts cost money.
- Upgrade to Vercel Pro and Supabase Pro (commercial use, backups, no pausing). Ask the owner first.
- Enter our real company and bank details in Settings → Pay and billing (the dev project's demo data has made-up ones).
- Before we pass about 1,000 active workers, or 1,000 shifts in a week: the matching engine and the weekly pay run read at most 1,000 rows at a time, so they need to read in pages, as the expiry checks already do.

## Owner setup checklist

- [x] Supabase organisation "Muster" and project `muster-dev` (Sydney region).
- [x] GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`, `SUPABASE_SECRET_KEY`.
- [ ] ABN Lookup GUID requested at abr.business.gov.au. When it arrives, add `ABN_LOOKUP_GUID` to Vercel and to the cloud environment's variables.
- [ ] Vercel project imported from GitHub, environment variables added (steps in README).
- [ ] Decide whether the GitHub repository should be private. It's public now, so anyone can read the code and BRIEF.md.
- [ ] Optional: allow `ui.shadcn.com` and `abr.business.gov.au` in the cloud environment's network settings, so the shadcn CLI and the live ABN lookup work from the build container.
