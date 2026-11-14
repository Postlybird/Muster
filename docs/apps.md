# Store apps

The plan the owner approved on 14/11/2026 ("ok to both"), built before the company's Apple and Google accounts exist so the apps are ready when they do.

## How it works

- **One app** for workers, businesses and our team. It takes its name from `src/config/brand.ts`, and sign-in decides what each person sees, as on the website.
- **Built with Capacitor 8:** a native iPhone and Android app whose screen is the live website, with the phone's own features added through Capacitor plugins:
  - notifications through Firebase Cloud Messaging on both phones, sent by the server;
  - the phone's location for clock-in;
  - the camera and photo library, through the website's own upload fields;
  - links to the website in texts and emails open the app (universal links on iPhone, app links on Android).
- **Updates:** website changes reach the app straight away. Only changes to the native parts (`android/`, `ios/`, `capacitor.config.ts` and the plugins) need a store update.
- **Offline:** when the phone has no connection, the app shows its own "no connection" screen with a "Try again" button.

## Steps

1. **Delete my account** for workers and business users, and a public page saying how (both stores require it).
2. **The reviewers' sign-in.**
3. **The app shells:** the Android and iPhone projects, name, icon, opening screen, offline screen and permissions.
4. **Notifications:** phones register with Firebase, and the server sends to them as it does to web notifications.
5. **Location and app links.**
6. **Automatic builds on GitHub:** an installable Android test app and an iPhone simulator build on each change, then signed builds for TestFlight and Google Play's internal testing once the accounts exist.
7. **The store listings:** descriptions, screenshots, Apple's privacy answers, Google's data safety form and content ratings.

## The owner's decisions (14/11/2026)

- **Delete my account:** it signs the person out for good and stops their messages, and removes their photo, phones and availability straight away. Hours, pay and invoices are kept for 7 years, as the law requires, which both stores allow. Anyone with shifts booked is asked to cancel them first.
- **The stores' reviewers:** they can't receive our emailed codes, so one reviewers' account signs in with a fixed code that only the stores are given. It's the one exception to "no passwords":
  - the code works only while an admin has switched review sign-in on, during a review;
  - the account is a worker we haven't checked, so reviewers can look around (nearby shifts and pay, settings) but can't apply for real shifts or see any business's details;
  - the email and code are kept in the live site's settings, never in the code: `APP_REVIEW_EMAIL` (an address of ours, like a support alias) and `APP_REVIEW_CODE` (6 digits) in the live Vercel project;
  - switching it on (Admin → Settings → Workers) makes the account, or opens it again if a reviewer deleted it, and takes it through the quick sign-up; every try is recorded, and ten wrong codes switch it off;
  - in each store's review notes: "Sign in as a worker with this email; when asked for the code, type this code."

## What needs the owner's accounts

| Account | What it gives the apps |
|---|---|
| Apple Developer Program (a business, US$99 a year, with the company's D-U-N-S number) | The Team ID, for universal links; an App Store Connect API key, for signing and uploading builds (a GitHub secret); and an Apple push key, uploaded to Firebase |
| Google Play Console (a business, US$25 once, with the D-U-N-S number) | The app's signing certificate fingerprint, for app links; and a service account key for uploading builds (a GitHub secret) |
| Firebase (free) | The app configuration files for Android and iPhone (GitHub secrets, written in at build time), and a service account key for sending notifications (Vercel) |

The owner gets click-by-click steps for each account, one at a time, and types keys into GitHub and Vercel, never into chat.

## What's built (14/11/2026)

- **The apps:** `android/` and `ios/` (Capacitor 8), opening `brand.website`; `npm run app:sync` writes the name, IDs, link host and "no connection" page from `src/config/brand.ts`, and `npm run icons` draws the icons and opening screens.
- **Inside the app:** the phone's own notifications (Settings → "Notifications on this phone"), location for clock-in, and camera for uploads; links to the website, and tapped notifications, open the matching page.
- **Delete my account** and **the reviewers' sign-in**, on the website and so in the apps.
- **Builds:** `.github/workflows/apps.yml` builds an Android test app (kept 30 days on the run's page) and checks the iPhone app on every change; `.github/workflows/apps-release.yml` ("Phone apps for the stores", run by hand) signs them and sends them to TestFlight and Google Play's internal testing.
- **The listings:** `docs/store/listing.md` (description, privacy answers, ratings, review notes) and `docs/store/screenshots/`.

## Trying the Android app now

1. On GitHub, open the repository's **Actions** tab, then **Phone apps**, and the newest run with a green tick.
2. Under **Artifacts**, download **android-test-app** and unzip it.
3. Copy `app-debug.apk` to an Android phone and open it; allow installing from that source when the phone asks.

It opens the demo (www.shifta.com.au until the switch-over; then set the repository variable `APP_TEST_SERVER_URL` to https://demo.shifta.com.au). Notifications wait for Firebase.

## Getting them into the stores (after the company's D-U-N-S number)

The owner gets click-by-click steps for each, one at a time:

1. **Apple Developer Program** as an organisation (US$99 a year), then the app in App Store Connect, an App Store Connect API key, and an Apple push key for Firebase.
2. **Google Play Console** as an organisation (US$25 once), then the app, an upload key, and a service account for uploads.
3. **Firebase** (free): a project with the Android and iPhone apps, the Apple push key, and a service account key for sending.
4. **GitHub:** an environment named `stores`, locked to `main` with the owner as reviewer, holding `APPLE_TEAM_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY`, `ANDROID_UPLOAD_KEYSTORE` (base64), `ANDROID_UPLOAD_KEYSTORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`, `PLAY_SERVICE_ACCOUNT_JSON`, `FIREBASE_ANDROID_CONFIG` and `FIREBASE_IOS_CONFIG`; and `FIREBASE_ANDROID_CONFIG` as a repository secret too, for the test builds.
5. **The live site's settings (Vercel):** `APP_PUSH_PROVIDER=fcm`, `FIREBASE_SERVICE_ACCOUNT`, `APPLE_TEAM_ID`, `ANDROID_CERT_SHA256` (from Play's app signing page), `APP_REVIEW_EMAIL` and `APP_REVIEW_CODE`.
6. **Run "Phone apps for the stores"** from the Actions tab. Google takes the first upload by hand (the app bundle is on the run's page); after that it goes straight to internal testing. Try both on the owner's phone (TestFlight, and Play's internal testing).
7. **Fill in the listings** from `docs/store/listing.md`, switch on the reviewers' sign-in, and submit.
