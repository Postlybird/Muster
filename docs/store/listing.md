# The store listings

What goes into App Store Connect and the Google Play Console for the phone apps (`docs/apps.md`), for the owner to check before submitting. The screenshots are in `docs/store/screenshots/` (`npm run app:screenshots` takes them again from the demo, without its banner; the people and businesses in them are the demo's made-up ones). Everything here describes only what the app really does.

## The listing

- **Name:** Shifta
- **Subtitle (Apple, up to 30 characters):** Shifts and staff on demand
- **Short description (Google, up to 80 characters):** Sydney businesses book checked staff in minutes. Workers pick up shifts.
- **Promotional text (Apple, up to 170 characters):** Sydney businesses book checked, job-ready staff in minutes. Workers pick up shifts near them and get paid every week.
- **Category:** Business (both stores).
- **Keywords (Apple, up to 100 characters):** shifts,casual work,jobs,labour hire,staff,cleaner,labourer,restoration,removalist,Sydney
- **Support:** https://www.shifta.com.au/contact
- **Privacy policy:** https://www.shifta.com.au/privacy
- **Deleting an account (Google):** https://www.shifta.com.au/delete-account

**Description:**

> Shifta connects Sydney businesses with checked, job-ready workers, one shift at a time.
>
> FOR WORKERS
> • Sign up in about two minutes, then add your ID, right to work and tickets in your own time.
> • See shifts near you and the pay, then apply or accept.
> • Get the address and reminders once you're booked.
> • Clock in and out on site, and see how your pay adds up.
> • Get paid every week. We employ you as a casual, so you're covered by the award.
>
> FOR BUSINESSES
> • Post a shift in about a minute, or a call-out when you need someone fast.
> • Choose from the workers who apply, or let the first ones who accept take it.
> • See who's arrived, approve hours and rate workers.
> • Get one invoice a week, with a line for each rate.
>
> We check every worker's ID, right to work and tickets before they can take work.
>
> Work in Sydney for general labourers, commercial and builders cleaners, restoration labourers and technicians, and removalist offsiders.

## Apple: App Privacy

No tracking, and nothing is used for advertising. Everything collected is linked to the person and used only for the app's functions:

| Apple's data type | What it is in Shifta |
|---|---|
| Contact info: name, email address, phone number | The account, messages and texts |
| Location: precise | Where the phone is at clock-in and clock-out |
| Location: coarse | The worker's home suburb, for shifts near them |
| User content: photos | The worker's photo, photo ID and selfie, and photos of tickets and documents |
| User content: other | "About me", notes with applications, safety reports and ratings |
| Identifiers: user ID | The account |
| Identifiers: device ID | The phone's notification token, once notifications are on |
| Other data | Date of birth, right to work and visa details, and the outcomes of checks |

Not collected: health, financial info (tax file numbers, super and bank details go straight to the payroll provider), contacts, browsing and search history, purchases, usage data and diagnostics.

## Google Play: Data safety

- **Collected:** personal info (name, email address, phone number, home suburb, and other info: date of birth and right to work); location (approximate and precise); photos; files and documents (ID and ticket uploads); device or other IDs (the notification token).
- **Why:** app functionality and account management; for photo ID, right to work and tickets, also fraud prevention, security and compliance.
- **Shared:** none. Google doesn't count service providers, or what a worker sends to a business by applying, as sharing.
- **Security:** encrypted in transit.
- **Deleting:** people can delete their account in the app, or say how on https://www.shifta.com.au/delete-account. What the law requires is kept for 7 years.

## Ratings and audience

- **Google's content rating (IARC), "Utility, productivity, communication or other":** no violence, sexual content, language, drugs, gambling or purchases. People can share content with other users (bios, application notes and ratings, seen by businesses), but don't chat, and their location isn't shown to other users.
- **Apple's age rating:** no objectionable content and no open web browsing; the same answer on user content as for Google.
- **Google's target audience:** 18 and over (workers must be 18 or older). Not designed for children.

## The review notes

> Shifta is for casual workers and the businesses that hire them, in Sydney. Sign in with the email below; when asked for the 6-digit code, type the code below instead of waiting for an email. The account is a worker we haven't checked yet: it shows shifts near them and the pay, and the steps to get ready to work, but can't apply for shifts. Delete my account is in Settings.
>
> Email: (APP_REVIEW_EMAIL from the live site's settings)
> Code: (APP_REVIEW_CODE)

Before submitting, switch on "Let the app stores' reviewers sign in" (Admin → Settings → Workers), and switch it off when the review is done.
