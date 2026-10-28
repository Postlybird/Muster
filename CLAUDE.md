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
- **Business rules** (eligibility, pay/bill, hours, expiry, reliability) live in `src/domain/` as pure functions with Vitest tests next to them.
- **Data access:** user-initiated reads and writes use the signed-in user's Supabase client, so RLS applies. Use the service-role client only in cron jobs, seeding and audited admin actions.
- **UI:** shadcn/ui-style components in `src/components/ui/`, written by hand on Radix (`radix-ui` package) because the shadcn registry is blocked from the cloud container. Mobile-first for workers, large tap targets, one main action per screen.
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
