# Muster

On-demand labour hire for property services and trades. Businesses request
workers for shifts; vetted workers pick up shifts from their phones. We are
the labour hire provider. "Muster" is a working name, set in
`src/config/brand.ts`.

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
- **Database:** `.github/workflows/db-deploy.yml` applies new migrations and the demo data to the Supabase project `muster-dev`. It uses the repository secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` and `SUPABASE_SECRET_KEY`.
- **App:** Vercel, with functions pinned to Sydney (`syd1`, see `vercel.json`). Set these environment variables in Vercel:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project id>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → publishable key |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → secret key (mark it Sensitive) |
| `DEMO_MODE` | `true` while we're building; `false` in production |
