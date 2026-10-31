# Shifta

Work, sorted. On-demand labour hire for every industry:
businesses book checked staff for shifts, and workers pick up shifts on their
phones. We are the labour hire provider. The name, slogan and contact details
are set in `src/config/brand.ts`. (The repository and the Supabase project
`muster-dev` keep the earlier working name, Muster.)

- **Spec:** [`BRIEF.md`](BRIEF.md)
- **Approved plan:** [`docs/plan.md`](docs/plan.md)
- **Where we're up to:** [`PROGRESS.md`](PROGRESS.md)

## Stack

Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Radix-based UI
components, Supabase (Postgres, Auth, Storage; Sydney region), Vercel,
Vitest and Playwright. Every outside service (email, SMS, maps, ABN lookup,
payroll and so on) sits behind an adapter in `src/adapters/` with a mock, so
the app runs end to end on demo data with no paid accounts.

## Run it locally

You need Node.js 22 and Docker.

1. `npm install`
2. `npm run db:start` starts a local Supabase in Docker and prints its URL and keys.
3. `cp .env.example .env.local`, then fill in the Supabase values printed in step 2.
4. `npm run db:reset && npm run seed` builds the database and loads demo data.
5. `npm run dev`, then open http://localhost:3000.

## Checks

```bash
npm run check      # lint, type check, unit tests
```

```bash
npm run test:db    # database access-rule tests (needs local Supabase)
```

```bash
npm run test:e2e   # browser tests (needs local Supabase + seed)
```

```bash
npm run test:acceptance   # the Phase 1 acceptance run (needs local Supabase + seed)
```

`docs/testing.md` lists what the tests cover.

## Deployment

- **Code:** GitHub (`Postlybird/Muster`).
- **Checks:** every push runs `.github/workflows/ci.yml`:
  - lint, type check, formatting and unit tests
  - a throwaway local Supabase for the database rule tests
  - demo data, a production build and the browser tests on phone and desktop sizes
  - the Phase 1 acceptance run: 10 workers, 3 businesses and 20 shifts, through to the payroll file and invoices
- **Database:** `.github/workflows/db-deploy.yml` runs when migrations, the seed or the hosted settings change (or from the Actions tab: Deploy database → Run workflow). It uses the repository secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`, `SUPABASE_SECRET_KEY` and `CRON_SECRET`. On the Supabase project `muster-dev` it:
  - applies new migrations
  - pushes the sign-in settings in `deploy/muster-dev/supabase/config.toml` (the live site's address, and login codes going to the demo outbox). `supabase config push` changes only what that file declares.
  - loads the demo data, then checks a code by text (used to confirm a worker's mobile) and a sign-in code by email reach the demo outbox
  - saves the site's address and `CRON_SECRET` in the project's Vault, and runs one scheduled job to check the site accepts it
- **Scheduled jobs:** Supabase's scheduler (pg_cron) calls `/api/cron/<job>` on the live site with the `CRON_SECRET`: reminders, finished shifts, possible no-shows, timesheets and held notifications every 10 minutes, compliance hourly, and the pay run early each morning (it only runs on the run day). The schedule is in `supabase/migrations/20261030000000_scheduled_jobs.sql`. After changing `CRON_SECRET`, change it in Vercel and GitHub, redeploy the site, then run the database workflow again.
- **App:** Vercel, with functions pinned to Sydney (`syd1`, see `vercel.json`). Set these environment variables in Vercel:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project id>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → publishable key |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → secret key (mark it Sensitive) |
| `DEMO_MODE` | `true` while we're building; `false` in production |
| `CRON_SECRET` | A long random string (a password manager can make one; mark it Sensitive). Add the same value as the GitHub Actions secret `CRON_SECRET`, which the scheduled jobs use |

The app works out its own address from each request, so `NEXT_PUBLIC_SITE_URL` isn't needed on Vercel. The live site is https://muster-two-mauve.vercel.app; if its address changes, update `site_url` in `deploy/muster-dev/supabase/config.toml`.
