/**
 * The launch notice (owner, 20/11/2026): while the live site takes sign-ups
 * before shifts start, every page says when they start, and workers and
 * businesses are told what happens next. `when` is the admin's wording,
 * read after "Shifts start", like "in early 2027".
 */
export function launchWords(when: string) {
  const start = `Shifts start ${when.trim()}.`;
  return {
    /** The bar across the top of every page. */
    banner: `${start} Sign up now and we'll email you when we open.`,
    /** The same, short enough for a phone. */
    bannerShort: `${start} We'll email you.`,
    /** Above the sign-up forms. */
    signUp: `${start} Sign up now and we'll email you as soon as they open.`,
    /** A worker who has sent their details. */
    workerNext: `${start} Before then, we'll check your ID, right to work and tickets, and email you when you can pick up shifts.`,
    /** A business on its dashboard. */
    business: `${start} You can add your sites and set up your first shifts now, and we'll email you as soon as you can post them.`,
    /** A business reaching the last step of posting work. */
    cantPostYet: `${start} This one's saved, and we'll email you as soon as you can post it.`,
  };
}
