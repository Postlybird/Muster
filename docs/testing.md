# What the tests cover

Every push to GitHub runs the checks in `.github/workflows/ci.yml`:

- **Unit tests** (`npm test`): the business rules in `src/domain/` and the
  helpers in `src/lib/`, such as eligibility, pay and bill, hours, expiry,
  reliability, pay runs and notifications.
- **Database tests** (`npm run test:db`, in `supabase/tests/database/`): who
  can see and change what, and the database functions that post, book,
  cancel, clock, approve and pay.
- **Browser tests** (`npm run test:e2e`, in `e2e/`): people using the app, at
  phone and desktop sizes, including accessibility checks (WCAG 2.1 AA).
- **The Phase 1 acceptance run** (`npm run test:acceptance`), described
  below.

## The core flows (brief §4 to §7)

| Flow                        | Browser tests                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Moving between pages        | `navigation` (the loading bar while the next page loads)                                                                                                                 |
| Signing in and registering  | `auth` (registering from the home page, emailed codes only, the email link, wrong codes, who can open what), `public` (the phone menu's Sign in and Register), `demo`, `admin-mfa` |
| 4.1 Worker onboarding       | `worker-onboarding` (registering, the quick sign-up, shifts near them before they're checked, getting ready to work through to submitted, rejected checks, profile and availability), `admin-verification` (checks, activation, rejections, VEVO) |
| 4.2 Business onboarding     | `business-onboarding` (registering to submitted on one screen, the alert to our team, the first shift and site while we check them, ABNs we can't use), `admin-businesses` (approval, account terms, cancelled ABNs), `business-account` (sites, team and roles, agreement) |
| 4.3 Posting work            | `post-work` (cost before posting, posting again from the dashboard, templates, favourites' head start, urgent call-outs, who can post), `callouts` (making open work a call-out, accepting from the text, the 20-minute alert), `state-tickets` (each state's own working with children check for workers and for work)                                               |
| 4.4 Filling work            | `find-shifts` (what workers see, without the address), `bookings` (picking applicants, notes with applications, first in), `reminders`, `overtime` (overtime from a worker's other shifts: shown before picking, held back from first-in shifts unless allowed, and charged to the later booking)                                                                        |
| 4.5 Cancellations, no-shows | `cancellations` (worker and business cancellations, holds after no-shows)                                                                                                            |
| 4.6 On the day              | `on-the-day` (clocking in and out on site, without signal, safety reports, arrivals), `timesheets` (approving, changing, queries, auto-approval, missed clock-outs, each worker's pay at each rate with overtime)                  |
| 4.7 Ratings and reliability | `ratings` (rating each other, favourites, blocks), `worker-profiles` (what a business sees of a worker, and who can see it)                                                                                                                                    |
| 4.8 Pay and billing         | `pay-runs` (the weekly run, payroll file, invoices), `admin-rates` (rate cards and their award rules, bill rules, public holidays), `admin-rate-calculator` (splitting a shift, award overtime on a long weekday)                                                                                          |
| 4.9 Compliance              | `compliance` (ticket warnings and expiry, bookings at risk, VEVO re-checks), `admin-agreements-licences`, `admin-reports` (audit log)                                                |
| 5 Notifications             | `notifications` (push instead of texts, preferences, quiet hours, editing templates), `outbox`                                                                                       |
| 6 Admin console             | `admin-lists` (workers, businesses, shift board), `admin-queues`, `admin-reports` (reports, dashboard), `admin-catalogues`, `admin-settings`                                         |
| 7 Public pages (home and industry pages) | `public`, `a11y`                                                                                                                                                                 |

## The Phase 1 acceptance run

Brief §11: Phase 1 is done when "an admin can onboard 10 workers and 3
businesses, fill 20 shifts end to end, and produce the payroll export and
invoices without editing the database by hand". `e2e/acceptance/` does
exactly that, the way people would in the app:

1. Three business owners register with their ABN, confirm the business and
   accept the agreement on one screen, then add their site. An admin approves
   each one.
2. Ten workers register with their email, do the quick sign-up (mobile,
   suburb and work), then get ready to work: photo, ID, right to work,
   tickets and paperwork. An admin checks each one's photo, right to work, ID
   and tickets, records their payroll setup and activates them.
3. The businesses post 20 shifts over six jobs for the week after next,
   some "first in" and some "I'll choose".
4. Workers accept or apply; the owners choose from the applicants. Every
   shift is filled.
5. Time moves on: the booked shifts are moved back to last week, as if
   they'd been worked. This is the only change made outside the app.
6. Each owner enters and approves the rostered hours for everyone they had.
7. An admin runs last week's pay: the payroll file has a line per worker
   per shift, and each business has an invoice with its lines and a PDF.

It runs on every push, next to the other checks (about 2 minutes on
GitHub), and locally with `npm run test:acceptance`. It works on the demo
data and can run again on the same database.
