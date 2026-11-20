/**
 * The launch notice (owner, 20/11/2026): while the live site takes sign-ups
 * before shifts start, every page says when they start, and workers and
 * businesses are told what happens next. `when` is the admin's wording,
 * read after "Shifts start", like "in early 2027". Workers hear by app
 * notification or email, so their words say "let you know"; businesses
 * get emails.
 */
export function launchWords(when: string) {
  const start = `Shifts start ${when.trim()}.`;
  const workerWaiting = `${start} We'll let you know as soon as you can apply for shifts.`;
  return {
    /** The bar across the top of the app, for people who have signed up. */
    start,
    /** The bar across the top of the website. */
    banner: `${start} Sign up now and we'll let you know when we open.`,
    /** The same, short enough for a phone. */
    bannerShort: `${start} Sign up now.`,
    /** Above the sign-up forms. */
    signUp: `${start} Sign up now and we'll let you know as soon as they open.`,
    /** A worker who has just signed up, after "You're signed up." */
    workerSignedUp: `${workerWaiting} Until then, add your details below when you're ready, and we'll check them.`,
    /** Where a worker we haven't checked yet looks for shifts. */
    workerWaiting,
    /** A worker who has sent their details. */
    workerNext: `${start} Before then, we'll check your ID, right to work and tickets, and let you know when you can pick up shifts.`,
    /** A business on its dashboard. */
    business: `${start} You can add your sites and set up your first shifts now, and we'll email you as soon as you can post them.`,
    /** A business reaching the last step of posting work. */
    cantPostYet: `${start} This one's saved, and we'll email you as soon as you can post it.`,
  };
}
