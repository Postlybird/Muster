# Going live

The live site runs next to the demo (owner, 03/11/2026):

- **Live:** www.shifta.com.au, its own Supabase project (`shifta-live`, Sydney) and its own Vercel project. Demo mode is off, and email, texts, address search and app notifications are real. Its database holds only the real setup (`npm run seed:reference`), never demo data.
- **Demo:** demo.shifta.com.au, the `muster-dev` project and the existing Vercel project, with demo mode on. Every change is tried here first.
- **Releases:** the live site changes only when the owner says "release". The tested commit is then pushed to the `main` branch, and `.github/workflows/live-deploy.yml` updates the live database first, then builds the live site through its Vercel deploy hook. Vercel doesn't build `main` by itself (`vercel.json`).

The owner gets click-by-click steps for each account in chat, one at a time, and types keys into Vercel and GitHub, never into chat.

## Stage 2: accounts

| Service | What it's for | What we need from it |
|---|---|---|
| Twilio | Texts: mobile codes, call-outs, reminders | Account SID, auth token, and a Messaging Service whose sender is the registered sender name "Shifta" (ACMA Sender ID Register, through Twilio, with the ABN). In its messaging settings: texts to Australia only (geo permissions), and SMS pumping protection on |
| Resend | Every email, sign-in codes included | The domain shifta.com.au verified (DNS records at VentraIP), an API key, and the from address (like hello@shifta.com.au) |
| Google Cloud | Address search (Places API (New)) | An API key limited to the Places API (New), with billing on, a daily cap on Places requests (Quotas) and a budget alert, so a flood of searches can't run up the bill |
| Cloudflare Turnstile | The bot check on sign-in and register | A widget for www.shifta.com.au: site key and secret key |
| ABN Lookup | Checking businesses' ABNs | The GUID from abr.business.gov.au |
| Supabase | The live database | Pro plan; project `shifta-live` in Sydney; its database password, secret key and project ref; an access token for GitHub |
| Vercel | The live site | Pro plan; a second project from this repository with `main` as its production branch; a deploy hook for `main` |
| Web push | App notifications | A pair of keys, made in the demo's Admin → Settings → Push notifications |

## The live Vercel project's environment variables (Production)

Checked by `next.config.ts` when it builds (`src/lib/live-setup.ts`): the build stops if any is missing.

```
NEXT_PUBLIC_SUPABASE_URL=https://<live project ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<live publishable key>
SUPABASE_SECRET_KEY=<live secret key>
NEXT_PUBLIC_SITE_URL=https://www.shifta.com.au
DEMO_MODE=false
CRON_SECRET=<a new long random string, not the demo's; also LIVE_CRON_SECRET in GitHub>
AUTH_HOOK_SECRET=<another new long random string; also LIVE_AUTH_HOOK_SECRET in GitHub>
EMAIL_PROVIDER=resend
RESEND_API_KEY=<Resend API key>
EMAIL_FROM=Shifta <hello@shifta.com.au>
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<…>
TWILIO_AUTH_TOKEN=<…>
TWILIO_MESSAGING_SERVICE_SID=<…>
GEOCODER_PROVIDER=google
GOOGLE_MAPS_API_KEY=<…>
PUSH_PROVIDER=webpush
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<…>
VAPID_PRIVATE_KEY=<…>
ABN_LOOKUP_GUID=<…>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<Turnstile site key>
```

## The GitHub environment "live"

Secrets (named `LIVE_*` so they can't be mixed up with the demo's repository secrets):

```
LIVE_SUPABASE_ACCESS_TOKEN      a token that can reach shifta-live
LIVE_SUPABASE_DB_PASSWORD
LIVE_SUPABASE_PROJECT_ID        the project ref
LIVE_SUPABASE_SECRET_KEY
LIVE_CRON_SECRET                the same as CRON_SECRET in the live Vercel project
LIVE_AUTH_HOOK_SECRET           the same as AUTH_HOOK_SECRET in the live Vercel project
LIVE_RESEND_API_KEY             Supabase only lets its email limit change with a mail server set
LIVE_TURNSTILE_SECRET_KEY       Supabase checks the bot check's token
LIVE_VERCEL_DEPLOY_HOOK         the live project's deploy hook for main
```

Variable: `LIVE_EMAIL_FROM_ADDRESS` (like hello@shifta.com.au), the address Supabase's mail server setting uses. Its name comes from `src/config/brand.ts`.

Sign-in codes don't use Twilio's or Resend's keys in Supabase: Supabase hands every code to the live site (its send hooks, `/api/auth/hooks/sms` and `/email`, signed with `LIVE_AUTH_HOOK_SECRET`), which sends it with the site's own keys and limits (`src/domain/auth-messages.ts`): sign-in codes by email; texts only to confirm a new Australian mobile, at most five a day per person; no sign-in by text and no changing an email address.

The environment must be locked to releases (security review, 03/11/2026), as anything that names it gets its secrets:

1. GitHub → the repository → Settings → Environments → live.
2. Deployment branches and tags: "Selected branches and tags", and add `main`.
3. Required reviewers: tick it and add the owner, so each release and each new admin waits for the owner's click.

The workflows also refuse to run from any branch but `main`.

## Stage 3: the switch-over

1. Create `main` from the tested commit (the owner's "release"). `live-deploy.yml` runs: migrations, the live sign-in settings (`deploy/shifta-live`, read back to check every code goes through the live site's send hooks), the real setup, the scheduled jobs' target, then the live build. Codes are sent once step 2 points the address at the live site.
2. In Vercel, move www.shifta.com.au and shifta.com.au from the demo project to the live project, and give the demo project demo.shifta.com.au (a CNAME record at VentraIP).
3. In `deploy/muster-dev/supabase/config.toml`, set `site_url` to https://demo.shifta.com.au and push: the demo's sign-in links and scheduled jobs follow it. Set the demo Vercel project's `NEXT_PUBLIC_SITE_URL` to match.
4. Run `live-deploy.yml` again (Actions → "Deploy the live site" → Run workflow), so the scheduled jobs check passes against the live site.
5. The owner signs in on the live site once; run "Make an admin on the live site" with their email. They set up an authenticator app at their next sign-in.
6. The owner enters, in Admin → Settings: company details, bank account, margin, on-costs (including the workers' compensation rate) and anything else marked as a placeholder; and the approved documents in Admin → Agreements.
7. Run-through with the owner's own email and mobile: sign-in code by email (the bot check first: it couldn't be tried from the build environment, where Cloudflare is blocked), the mobile code by text, a site address search, a test shift booked, and its messages. Then archive the test records.

## Releasing after that

Changes go to the demo first. When the owner says "release": run the full checks, push the tested commit to `main`, and watch "Deploy the live site" and the Vercel build. A migration must work with the site version before it, as the database is updated first.
