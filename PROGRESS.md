# Progress

_Last updated: 28/10/2026_

## Status

**Phase 0: Foundations, in progress.** The owner approved the Phase 0/1 plan (`docs/plan.md`) on 28/10/2026 and asked us to start Phase 0.

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

## Next

- **0.3** Sign-in: SMS code, email code/link, demo "sign in as", role routing.
- **0.4** Design system and layouts. **0.5** Adapters and mocks. **0.6** Seed script. **0.7** CI, DB deploy workflow, Vercel.

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

## Open questions for the owner

- **The 10 questions in `docs/plan.md`.** We're using the recommendations unless the owner says otherwise. They must be settled before Phase 1 starts.
- **Employment Hero timesheet import template.** Needed by step 1.13.
- **Company details for tax invoices** (legal name, ABN, address, bank details). Placeholders until provided.

## Owner setup checklist

- [x] Supabase organisation "Muster" and project `muster-dev` (Sydney region).
- [x] GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`, `SUPABASE_SECRET_KEY`.
- [ ] ABN Lookup GUID requested at abr.business.gov.au. When it arrives, add `ABN_LOOKUP_GUID` to Vercel and to the cloud environment's variables.
- [ ] Vercel project imported from GitHub, environment variables added (steps in README).
- [ ] Optional: allow `ui.shadcn.com` and `abr.business.gov.au` in the cloud environment's network settings, so the shadcn CLI and the live ABN lookup work from the build container.
