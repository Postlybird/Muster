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

## Next

- Owner: set up Vercel (steps in README / the latest chat message), then send the preview URL.
- Then: push the Supabase sign-in settings (allowed redirect URLs, demo login-code hooks) to `muster-dev` via `supabase config push`.
- Then: review of Phase 0 with the owner, the 10 open questions, then Phase 1 (step 1.1).

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

## Open questions for the owner

- **The 10 questions in `docs/plan.md`.** We're using the recommendations unless the owner says otherwise. They must be settled before Phase 1 starts.
- **Employment Hero timesheet import template.** Needed by step 1.13.
- **Company details for tax invoices** (legal name, ABN, address, bank details). Placeholders until provided.

## Before launch (not now)

- Set `DEMO_MODE=false` in production; seed demo data into the dev project only.
- Point the Supabase Auth SMS and email hooks at our adapters (Twilio, Resend). These are paid services: ask the owner first.
- Turn on CAPTCHA for code requests (Cloudflare Turnstile is free) to stop SMS-pumping fraud once real texts cost money.
- Upgrade to Vercel Pro and Supabase Pro (commercial use, backups, no pausing). Ask the owner first.

## Owner setup checklist

- [x] Supabase organisation "Muster" and project `muster-dev` (Sydney region).
- [x] GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`, `SUPABASE_SECRET_KEY`.
- [ ] ABN Lookup GUID requested at abr.business.gov.au. When it arrives, add `ABN_LOOKUP_GUID` to Vercel and to the cloud environment's variables.
- [ ] Vercel project imported from GitHub, environment variables added (steps in README).
- [ ] Optional: allow `ui.shadcn.com` and `abr.business.gov.au` in the cloud environment's network settings, so the shadcn CLI and the live ABN lookup work from the build container.
