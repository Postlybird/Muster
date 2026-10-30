# Notes for Claude

At the start of every session:

1. Read `BRIEF.md` in full. It is the product spec and the source of truth.
2. Read `PROGRESS.md`: what's done, what's next, decisions made, open questions.
3. Read `docs/plan.md` for the approved Phase 0/1 plan (schema, pages, build order).

This project uses Next.js 16, which has breaking changes from older versions:

@AGENTS.md

## Working rules (from the brief)

- Work phase by phase (BRIEF.md §11). Before each phase, propose the plan and wait for the owner's OK.
- Ask the owner before adding a paid service, storing a new kind of personal data, or departing from the brief.
- Every external service sits behind an adapter in `src/adapters/` with a mock or manual implementation, so the app runs end to end with no paid accounts.
- Never commit secrets. Keys live in `.env.local`; keep `.env.example` current.
- Keep `PROGRESS.md` current (done, next, decisions, open questions). Commit in small working steps.
- The owner is not a developer. When they need to do something (create an account, add a key), give numbered, plain-English steps, and never ask them to paste keys into chat.
- Australian English and formats: dd/mm/yyyy, AUD, +61 phone numbers. Store times in UTC; show a shift's times in its site's time zone, and everything else in Australia/Sydney.

## Conventions

- **Database:** Supabase Postgres. Schema changes are SQL migrations in `supabase/migrations/` and are never edited once pushed; add a new migration instead.
  - RLS is enabled on every table.
  - The hosted project does **not** auto-grant new tables to the API roles, so every migration grants explicitly (`anon`, `authenticated`, `service_role`).
  - RLS tests live in `supabase/tests/`.
  - The hosted dev project's sign-in settings are in `deploy/muster-dev/supabase/config.toml`, pushed by the database workflow with `supabase config push` (which changes only what that file declares). Keep it in step with `supabase/config.toml`.
- **Scheduled jobs:** pg_cron calls `call_scheduled_job()`, which posts to `/api/cron/<job>` through pg_net with the `CRON_SECRET`. The site's address and the secret are in Vault, saved by the database workflow with `set_scheduled_job_target()`; where they aren't set (locally, CI), the jobs do nothing. Change a schedule with a new migration.
- **Records:** archive (`archived_at`), never hard-delete personal or employment records.
- **Money:** integer cents.
- **Time:** `timestamptz` in UTC; convert with the helpers in `src/lib/format.ts`. Shift times (screens, messages, timesheets, invoices and the payroll file) use the site's zone, `zoneOf(state)`: the functions that list shifts and timesheets return the site's `state`, and `shiftHours()`, `shiftSummary()`, `hoursLabel()`, `timeInputValue()` and `TimesheetDetails` require a zone. Hours typed into forms are read on the site's day (`shiftDay()`). Our team's screens add `zoneNote()` (" (Perth time)"). A worker's own settings (quiet hours, availability) follow their home state. Everything else, including pay weeks, is Sydney time.
- **Business rules** (eligibility, pay/bill, hours, expiry, reliability) live in `src/domain/` as pure functions with Vitest tests next to them. Price shifts with `loadPricing()` (`src/server/pricing.ts`), which feeds `splitShift()` and `costShift()` in `src/domain/pay.ts`.
- **Data access:** user-initiated reads and writes use the signed-in user's Supabase client, so RLS applies. Use the service-role client only in:
  - cron jobs, seeding, the deploy check of sign-in codes (`scripts/check-sign-in-codes.ts`) and audited admin actions
  - recording agreement acceptances (`src/server/agreements.ts`, so the IP address comes from the server)
  - creating a business from the ABN register's details, and checking an ABN isn't already registered (`src/app/business/onboarding/actions.ts`)
  - sending notifications (`src/server/notifications.ts`): who to tell, their devices, preferences and admins' template wording
  - reading rate cards and bill rules to price shifts (`src/server/pricing.ts`); callers only get the result
  - matching workers to shifts and texting urgent call-outs (`src/server/matching.ts`, which runs `src/lib/matching.ts`)
  - messages about bookings and reminders (`src/server/booking-notices.ts`, `src/server/reminders.ts`), and scheduled jobs in `src/app/api/cron/[job]/`, which need the `CRON_SECRET`
  - working out reliability from bookings (`src/server/reliability.ts`), and flagging possible no-shows (`src/server/attendance.ts`)
  - costing approved hours (`src/server/timesheets.ts`, which runs `src/lib/timesheet-costing.ts`) and messages about timesheets (`src/server/timesheet-notices.ts`)
  - the weekly pay run (`src/server/pay-runs.ts`, which runs `src/lib/pay-runs.ts`): previewing and saving runs, and making and emailing invoices
  - the compliance job (`src/server/compliance.ts`, which runs `src/lib/compliance.ts`): expiring tickets and visas, and checking bookings again
- **Reading many rows:** the database API returns at most 1,000 rows a request and doesn't say when it stops there. Jobs that read a whole table page through it with `allRows()` (`src/lib/supabase/all-rows.ts`), ordered by id.
- **UI:** shadcn/ui-style components in `src/components/ui/`, written by hand on Radix (`radix-ui` package) because the shadcn registry is blocked from the cloud container. Mobile-first for workers, large tap targets, one main action per screen. Worker forms use `NativeSelect` rather than the Radix select. A form that only works with JavaScript waits for `useHydrated()` (`src/lib/use-hydrated.ts`), as sign-in does, so an early tap can't reload the page with what was typed in the address.
- **Look:** colours are tokens in `src/app/globals.css`; the blue primary and hi-vis orange accent come from `src/config/brand.ts`, with `deep` (headlines, footer, dark bands) and `primary-soft` (light blue bands). Pages sit on a light page colour (`bg-background`); anything boxed on it (cards, lists, fields, tables) is `bg-card`, and tables are framed unless `bare`. Public pages are full width: bands of colour edge to edge, content in `Container`, and a `PageBand` title on inner pages. The font is Figtree (`@fontsource-variable/figtree`, bundled, so builds need no network). The logo mark is `src/config/logo.ts`; after changing it or the colours, run `npm run icons`. Public pages read industries through `listIndustries()` (`src/server/industries.ts`). The branded features (`BRAND_FEATURES` in `src/components/home/brand-features.tsx`) must only describe what the app really does, and the site has no made-up testimonials, client logos or numbers.
- **Navigation:** nothing hides behind a menu button. Signed-in areas have a sidebar from tablet width (`md`); on phones, workers get tabs along the bottom plus a row of the other pages under the header (`worker-nav.tsx`), and business users and admins get a row of every page (`ConsoleStripNav`). Sign out is in that row, the sidebar, and the worker's Settings.
- **Loading:** links swap pages in without a full reload, so the browser shows no loading of its own. `NavigationProgress` (root layout) shows an orange bar while the next page loads, and the worker, onboarding, business and admin areas each have a `loading.tsx` showing `PageSkeleton` at once. Pages there stream, so a `notFound()` or `redirect()` after the first `await` can't change the status code; call them first where the status matters. In browser tests the address changes while the outline still shows, and a full load reveals the page a moment after `goto()` returns: check for something on the page, or call `pageLoaded()` (`e2e/helpers.ts`), before checking that something isn't there or reading a list with `.all()` or `.count()`.
- **Long text** (agreements, contracts) scrolls inside `ScrollBox` (`src/components/scroll-box.tsx`), which keyboard users can reach. `expectAccessible()` in browser tests also fails a page that scrolls sideways, so let long emails wrap (`[overflow-wrap:anywhere]`).
- **Worker area:** `src/app/worker/(app)/` has the tabbed app; `src/app/worker/onboarding/` is the wizard, whose step pages also serve as edit pages once a worker has submitted (`StepFrame`, `StepActions`).
- **Admin access:** admin pages and actions call `requireAdmin()` (role plus authenticator app; the database's `is_admin()` checks the same). Log views of worker documents with `logAccess()` (`src/server/audit.ts`).
- **Business area:** `getMyBusiness()` (`src/server/businesses.ts`) returns the signed-in person's business and role, and joins them to a business they were invited to. Owners and managers run the account (`canManage()`); only owners change the team and billing details; supervisors see only their sites.
- **Posting work:** the steps in `src/app/business/post/[id]/` load the draft with `loadDraft()` (pages) or `draftForAction()` (actions) from `src/server/jobs.ts`, and end with `finishPostStep()`. Only the `post_job()` database function makes a job live; `duplicate_job()` copies one for templates and "Post again", whose shortcuts (templates and recent different jobs) come from `src/components/jobs/quick-post.tsx`. Job photos go in the `job-photos` bucket, in a folder named after the business.
- **Industries:** work types (`categories`) belong to an industry (`industries`, admin-managed, public to read; none means "other work"). Group them with `groupByIndustry()` (`src/lib/industries.ts`) wherever people choose work; an industry's icon name maps to an icon in `src/config/industry-icons.ts`.
- **States:** every state and territory is a row in `jurisdictions`, and admins open each one for work (`open_for_work`). `state_blocked()` (used by `post_job()` and the review step) blocks work in a state that isn't open, or that needs a labour hire licence we don't hold. Pricing, matching and costing use the site's state time zone (`STATE_TIME_ZONES` in `src/domain/pay.ts`). The website's city pages come from `src/config/cities.ts`, open or not by their state, through `listLocations()` (`src/server/locations.ts`). The demo address lookup uses `src/data/suburbs.ts`; suburb names repeat across states, so pass the state to `findSuburb()` when you have it. Tickets each state issues itself (RSA, working with children checks, traffic control) have a version per state (`credential_types.state`, sharing a `family`): jobs take their site's state's version and workers are asked for their home state's, through `ticketForState()` and `heldInState()` (`src/lib/state-tickets.ts`); the website names them by family. Public holidays are entered per state in Admin; the States page warns about an open state with none.
- **Matching:** `matchPostedJob()` and `refreshWorkerMatches()` (`src/server/matching.ts`) save each worker's eligibility for open shifts in `shift_matches`, using the rules in `src/domain/eligibility.ts`. Workers read their offers only through `my_shift_offers()` and `my_job_offer()`, which leave out the address and report-to details; businesses get `job_offer_count()`. Call `refreshWorkerMatches()` after anything that changes what a worker can take.
- **Bookings:** workers apply or accept, and businesses pick, only through the database functions `apply_for_shifts()`, `accept_shifts()`, `withdraw_applications()` and `book_applicant()`, which all book through `book_worker()`; it locks the shift and copies the shift's priced terms into `assignment_rates`. Workers read their shifts and jobs through `my_shifts()` and `my_job()` (the address only once booked); businesses read `job_applicants()` and `job_bookings()`.
- **Cancellations and no-shows:** only through `cancel_my_bookings()` (workers), `cancel_shifts()` (owners and managers), `admin_cancel_booking()` (our team: status `cancelled_by_admin`, no penalty or charge) and `report_no_show()` (anyone at the business who can see the job), which read their thresholds with `setting_numeric()`. After any of them, call `refreshReliability()`; rules are in `src/domain/reliability.ts`.
- **Admin console:** lists and reports read through admins-only functions: `admin_worker_list()`, `admin_shift_board()`, `admin_report_summary()`, `admin_report_breakdown()` and `admin_audit_log()`. Filters live in the page address (`src/lib/search-params.ts`); key filter forms by their values so a link that changes them resets the fields.
- **Admin queues:** matters are `admin_flags`, settled only through `settle_admin_flag()` with a note (the decisions open for each kind are in `src/lib/admin-flags.ts`); hours queries go through `resolve_timesheet()`. Possible no-shows settle themselves on a clock-in, a confirmed arrival or a no-show report.
- **On the day:** attendance is append-only `attendance_events`, added only through `clock()` (workers) and `confirm_arrival()` (the business); `attendanceOf()` in `src/lib/my-shifts.ts` says where a worker is up to. Safety reports go through `report_safety_issue()`, with photos in the `safety-photos` bucket.
- **Timesheets:** the database makes them, at clock-out (a trigger on `attendance_events`) or with `record_missing_timesheets()` for a missed clock-out; once one exists, attendance is closed. They change only through `approve_timesheets()`, `adjust_timesheet()`, `add_timesheet()`, `dispute_timesheet()`, `note_timesheet()`, `resolve_timesheet()` (admins) and `auto_approve_timesheets()`. Read them through `my_timesheets()` (with the worker's pay) and `business_timesheets()` (with the charge). After hours are approved or changed, call `costTimesheets()`, which saves `timesheet_costs` from the booking's rates, and `refreshReliability()` if the start moved: a booking counts towards reliability once its hours are in.
- **Ratings:** only through `rate_worker()` and `rate_site()`, once each per booking after the hours are approved; they keep the averages on `workers` and `businesses`. Tag codes live in `src/domain/ratings.ts` and in those functions. Favourites and blocks change through `src/server/business-workers.ts`, which refreshes matches. Workers see each business's average through `my_shift_offers()` and `my_job()`.
- **Pay runs:** each week (Monday to Sunday, Sydney) is run once, in order, by `runPayRun()` in `src/server/pay-runs.ts`: the `pay-run` cron job on the run day, or an admin from Pay runs. `planPayRunWith()` (`src/lib/pay-runs.ts`) lines up what `pay_run_candidates()` says is owed: approved hours as costed, and late cancellations priced by `costCancellation()` (`src/domain/pay-runs.ts`). Only `save_pay_run()` saves a run; it checks every line again and numbers the invoices, and a trigger locks paid hours. Invoice PDFs come from `src/lib/invoice-pdf.tsx` (@react-pdf/renderer, text through `pdfText()`), go in the private `invoices` bucket as `<business id>/<number>.pdf`, and are emailed with the PDF attached; `finishInvoices()` retries any that weren't. The PDF library is ESM-only, so `tsx` scripts like the seed can't render PDFs (the app and Vitest can). Businesses read invoices through RLS (owners and managers) and their lines through `invoice_lines()`, never the pay; admins mark them paid with `mark_invoice_paid()` and `mark_invoice_unpaid()`. The payroll file is `payrollLines()` through the payroll adapter.
- **Notifications:** every message goes through `notify()` (or `notifyAdmins()`, `notifyBusinessOwners()`, and `emailTemplate()` for an address that isn't a user) in `src/server/notifications.ts`, using a template from `src/config/notifications.ts`. Admins can change a template's words, so pass values rather than building text, and keep `{{link}}` at the end of worker messages. Channels, preferences and quiet hours are in `src/domain/notifications.ts`. Pass a `dedupeKey` for anything a job might send twice. Web push needs `PUSH_PROVIDER=webpush` and VAPID keys; in the demo a stand-in device writes to the outbox. Browser tests turn quiet hours off (`e2e/global-setup.ts`).
- **Compliance:** the hourly `compliance` job (`src/server/compliance.ts`) warns about and expires tickets and visas (rules in `src/domain/expiry.ts`), tells admins about VEVO re-checks due, and flags booked shifts that no longer pass the rules as `booking_at_risk` admin flags.
- **Uploads:** browser to private storage via `FileUpload` (`src/components/forms/file-upload.tsx`), in a folder named after the worker's id. Server actions accept a path only through `acceptedUpload()` in `src/lib/uploads.ts`.
- **Brand:** the product name lives only in `src/config/brand.ts`.
- **Tests:** `docs/testing.md` maps the brief's flows to the browser tests. The Phase 1 acceptance run (`e2e/acceptance/`, its own Playwright config and CI job) takes 3 businesses and 10 workers from sign-up to the payroll file and invoices through the app; its only database change is moving the booked shifts back to last week. When a flow's screens change, update its steps in `e2e/acceptance/flows.ts` too.
- **Adapters:** each outside service lives in `src/adapters/<name>/` as a typed interface, a mock or manual implementation, and a `get<Name>()` factory.
  - Mocks for email, SMS and push write to `dev_outbox`.
  - The ABN adapter has a live implementation (free ABR service), used when `ABN_LOOKUP_GUID` is set.
  - Add a real paid provider only after the owner approves it, selected by its `*_PROVIDER` env var.

## Commands

| Command                   | What it does                                                    |
| ------------------------- | --------------------------------------------------------------- |
| `npm run dev`             | Next.js dev server on http://localhost:3000                     |
| `npm run check`           | lint + typecheck + unit tests                                   |
| `npm run test:e2e`        | Playwright (starts the dev server unless `E2E_BASE_URL` is set) |
| `npm run test:acceptance` | The Phase 1 acceptance run in `e2e/acceptance/` (own config)    |
| `npm run db:start`        | Start local Supabase (Docker)                                   |
| `npm run db:reset`        | Rebuild the local database from migrations                      |
| `npm run test:db`         | RLS/database tests (pgTAP)                                      |
| `npm run seed`            | Load demo data (idempotent)                                     |
| `npm run db:types`        | Regenerate `src/lib/supabase/database.types.ts`                 |

## Cloud container notes

- The Docker daemon may not be running. Start it with `dockerd > /tmp/dockerd.log 2>&1 &`.
- Image pulls for local Supabase can fail:
  - `public.ecr.aws` (the default registry) with "Data limit exceeded".
  - Docker Hub with "429 Too Many Requests".

  What works: set `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io` for every `supabase` command. For any image Docker Hub refuses, run `docker pull mirror.gcr.io/supabase/<image>:<tag>`, then `docker tag` it to `supabase/<image>:<tag>`. `npx supabase services` lists the tags; `pg_prove:3.36` and `postgres-meta:<tag>` are needed for `test:db` and `db:types`.
- Postgres grants EXECUTE on new functions to PUBLIC by default. The base migration revokes that globally; `supabase/tests/database/00_security_baseline.test.sql` fails if any function becomes callable by `anon`.
- `ui.shadcn.com` and `abr.business.gov.au` are blocked by this environment's network policy. Components are hand-written; the live ABN adapter can only be exercised from Vercel or once the owner allows the host.
- Playwright browsers are pre-installed for `@playwright/test@1.63.0`. Keep that exact version unless you also install browsers.
