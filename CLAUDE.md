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
- Australian English and formats: dd/mm/yyyy, AUD, +61 phone numbers. Store times in UTC, display in Australia/Sydney.

## Conventions

- **Database:** Supabase Postgres. Schema changes are SQL migrations in `supabase/migrations/` and are never edited once pushed; add a new migration instead.
  - RLS is enabled on every table.
  - The hosted project does **not** auto-grant new tables to the API roles, so every migration grants explicitly (`anon`, `authenticated`, `service_role`).
  - RLS tests live in `supabase/tests/`.
- **Records:** archive (`archived_at`), never hard-delete personal or employment records.
- **Money:** integer cents.
- **Time:** `timestamptz` in UTC; convert with the helpers in `src/lib/format.ts`.
- **Business rules** (eligibility, pay/bill, hours, expiry, reliability) live in `src/domain/` as pure functions with Vitest tests next to them. Price shifts with `loadPricing()` (`src/server/pricing.ts`), which feeds `splitShift()` and `costShift()` in `src/domain/pay.ts`.
- **Data access:** user-initiated reads and writes use the signed-in user's Supabase client, so RLS applies. Use the service-role client only in:
  - cron jobs, seeding and audited admin actions
  - recording agreement acceptances (`src/server/agreements.ts`, so the IP address comes from the server)
  - creating a business from the ABN register's details, and checking an ABN isn't already registered (`src/app/business/onboarding/actions.ts`)
  - looking up who to text or email about their account (`src/server/notify.ts`)
  - reading rate cards and bill rules to price shifts (`src/server/pricing.ts`); callers only get the result
  - matching workers to shifts and texting urgent call-outs (`src/server/matching.ts`, which runs `src/lib/matching.ts`)
  - messages about bookings and reminders (`src/server/booking-notices.ts`, `src/server/reminders.ts`), and scheduled jobs in `src/app/api/cron/[job]/`, which need the `CRON_SECRET`
  - working out reliability from bookings (`src/server/reliability.ts`)
- **UI:** shadcn/ui-style components in `src/components/ui/`, written by hand on Radix (`radix-ui` package) because the shadcn registry is blocked from the cloud container. Mobile-first for workers, large tap targets, one main action per screen. Worker forms use `NativeSelect` rather than the Radix select.
- **Long text** (agreements, contracts) scrolls inside `ScrollBox` (`src/components/scroll-box.tsx`), which keyboard users can reach. `expectAccessible()` in browser tests also fails a page that scrolls sideways, so let long emails wrap (`[overflow-wrap:anywhere]`).
- **Worker area:** `src/app/worker/(app)/` has the tabbed app; `src/app/worker/onboarding/` is the wizard, whose step pages also serve as edit pages once a worker has submitted (`StepFrame`, `StepActions`).
- **Admin access:** admin pages and actions call `requireAdmin()` (role plus authenticator app; the database's `is_admin()` checks the same). Log views of worker documents with `logAccess()` (`src/server/audit.ts`).
- **Business area:** `getMyBusiness()` (`src/server/businesses.ts`) returns the signed-in person's business and role, and joins them to a business they were invited to. Owners and managers run the account (`canManage()`); only owners change the team and billing details; supervisors see only their sites.
- **Posting work:** the steps in `src/app/business/post/[id]/` load the draft with `loadDraft()` (pages) or `draftForAction()` (actions) from `src/server/jobs.ts`, and end with `finishPostStep()`. Only the `post_job()` database function makes a job live; `duplicate_job()` copies one for templates and "Post again". Job photos go in the `job-photos` bucket, in a folder named after the business.
- **Matching:** `matchPostedJob()` and `refreshWorkerMatches()` (`src/server/matching.ts`) save each worker's eligibility for open shifts in `shift_matches`, using the rules in `src/domain/eligibility.ts`. Workers read their offers only through `my_shift_offers()` and `my_job_offer()`, which leave out the address and report-to details; businesses get `job_offer_count()`. Call `refreshWorkerMatches()` after anything that changes what a worker can take.
- **Bookings:** workers apply or accept, and businesses pick, only through the database functions `apply_for_shifts()`, `accept_shifts()`, `withdraw_applications()` and `book_applicant()`, which all book through `book_worker()`; it locks the shift and copies the shift's priced terms into `assignment_rates`. Workers read their shifts and jobs through `my_shifts()` and `my_job()` (the address only once booked); businesses read `job_applicants()` and `job_bookings()`.
- **Cancellations and no-shows:** only through `cancel_my_bookings()` (workers), `cancel_shifts()` (owners and managers) and `report_no_show()` (anyone at the business who can see the job), which read their thresholds with `setting_numeric()`. After any of them, call `refreshReliability()`; rules are in `src/domain/reliability.ts`.
- **Uploads:** browser to private storage via `FileUpload` (`src/components/forms/file-upload.tsx`), in a folder named after the worker's id. Server actions accept a path only through `acceptedUpload()` in `src/lib/uploads.ts`.
- **Brand:** the product name lives only in `src/config/brand.ts`.
- **Adapters:** each outside service lives in `src/adapters/<name>/` as a typed interface, a mock or manual implementation, and a `get<Name>()` factory.
  - Mocks for email, SMS and push write to `dev_outbox`.
  - The ABN adapter has a live implementation (free ABR service), used when `ABN_LOOKUP_GUID` is set.
  - Add a real paid provider only after the owner approves it, selected by its `*_PROVIDER` env var.

## Commands

| Command            | What it does                                                    |
| ------------------ | --------------------------------------------------------------- |
| `npm run dev`      | Next.js dev server on http://localhost:3000                     |
| `npm run check`    | lint + typecheck + unit tests                                   |
| `npm run test:e2e` | Playwright (starts the dev server unless `E2E_BASE_URL` is set) |
| `npm run db:start` | Start local Supabase (Docker)                                   |
| `npm run db:reset` | Rebuild the local database from migrations                      |
| `npm run test:db`  | RLS/database tests (pgTAP)                                      |
| `npm run seed`     | Load demo data (idempotent)                                     |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts`                 |

## Cloud container notes

- The Docker daemon may not be running. Start it with `dockerd > /tmp/dockerd.log 2>&1 &`.
- Image pulls for local Supabase can fail:
  - `public.ecr.aws` (the default registry) with "Data limit exceeded".
  - Docker Hub with "429 Too Many Requests".

  What works: set `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io` for every `supabase` command. For any image Docker Hub refuses, run `docker pull mirror.gcr.io/supabase/<image>:<tag>`, then `docker tag` it to `supabase/<image>:<tag>`. `npx supabase services` lists the tags; `pg_prove:3.36` and `postgres-meta:<tag>` are needed for `test:db` and `db:types`.
- Postgres grants EXECUTE on new functions to PUBLIC by default. The base migration revokes that globally; `supabase/tests/database/00_security_baseline.test.sql` fails if any function becomes callable by `anon`.
- `ui.shadcn.com` and `abr.business.gov.au` are blocked by this environment's network policy. Components are hand-written; the live ABN adapter can only be exercised from Vercel or once the owner allows the host.
- Playwright browsers are pre-installed for `@playwright/test@1.63.0`. Keep that exact version unless you also install browsers.
