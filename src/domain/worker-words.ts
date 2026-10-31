/**
 * Words a worker writes for businesses to read: the bio on their profile
 * ("a little about you") and the note when they apply for a job. Short, and
 * with no way to reach them outside Shifta, which keeps their details
 * private and the work with us. `worker_words_ok()` in the database applies
 * the same rules.
 */

/** An application note. */
export const WORKER_WORDS_MAX = 300;
/** The bio, which has always allowed a little more. */
export const BIO_MAX = 500;

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const LINK =
  /(?:https?:\/\/|www\.)|\b[a-z0-9-]+\.(?:com|net|org|io|co|me|app|biz|info|au)\b/i;
/** A run of digits, perhaps spaced or bracketed, long enough to be a phone number. */
const DIGIT_RUN = /\+?\(?\d[\d\s().-]{6,}\d/g;
const AU_PHONE = /^(?:(?:\+?61|0)[2-478]\d{8}|1[38]00\d{6}|13\d{4})$/;

function hasPhoneNumber(text: string): boolean {
  return [...text.matchAll(DIGIT_RUN)].some((run) =>
    AU_PHONE.test(run[0].replace(/[^\d+]/g, "")),
  );
}

/** Why these words can't be shown to businesses, or null if they can. */
export function workerWordsProblem(
  text: string,
  max: number = WORKER_WORDS_MAX,
): string | null {
  // Characters, not UTF-16 units, as the database counts them.
  if ([...text].length > max) return `Keep it to ${max} characters`;
  if (EMAIL.test(text)) {
    return "Take out the email address. Businesses reach you through Shifta.";
  }
  if (LINK.test(text)) {
    return "Take out the link. Businesses reach you through Shifta.";
  }
  if (hasPhoneNumber(text)) {
    return "Take out the phone number. Businesses reach you through Shifta.";
  }
  return null;
}
