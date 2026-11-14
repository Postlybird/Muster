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
