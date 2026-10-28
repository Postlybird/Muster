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

## Deployment

- **Code:** GitHub (`Postlybird/Muster`).
- **App:** Vercel. Previews come from every pushed branch, and functions run in Sydney (`syd1`).
- **Database:** the Supabase project `muster-dev`. Migrations and demo data are applied by the GitHub workflow in `.github/workflows/`.
