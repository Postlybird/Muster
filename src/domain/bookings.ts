/**
 * Taking work (brief §4.4): what happened when a worker applied for or
 * accepted shifts, or a business picked an applicant, in plain words. The
 * results come from the database functions that book (see the bookings
 * migration).
 */

export type TakeResult =
  | "applied"
  | "already_applied"
  | "not_offered"
  | "booked"
  | "already_booked"
  | "full"
  | "closed"
  | "not_eligible"
  | "clash"
  | "not_ready";

export type Outcome = { ok: boolean; message: string };

export function shiftsLabel(count: number): string {
  return count === 1 ? "1 shift" : `${count} shifts`;
}

function count(results: readonly string[], ...kinds: TakeResult[]): number {
  return results.filter((result) => (kinds as string[]).includes(result))
    .length;
}

/** Why some shifts didn't go through, one sentence each. */
function problems(results: readonly string[], they: "you" | "they"): string[] {
  const sentences: string[] = [];
  const full = count(results, "full", "closed");
  if (full > 0) {
    sentences.push(
      full === 1
        ? "1 shift had already filled up."
        : `${full} shifts had already filled up.`,
    );
  }
  const clash = count(results, "clash");
  if (clash > 0) {
    sentences.push(
      `${shiftsLabel(clash)} ${clash === 1 ? "clashes" : "clash"} with a shift ${they}'re already booked on.`,
    );
  }
  const notEligible = count(results, "not_eligible", "not_offered");
  if (notEligible > 0) {
    sentences.push(
      they === "you"
        ? `You can't take ${shiftsLabel(notEligible)} any more. Check your tickets and availability.`
        : `They can't take ${shiftsLabel(notEligible)} any more, as their tickets or availability changed.`,
    );
  }
  const notReady = count(results, "not_ready");
  if (notReady > 0) {
    sentences.push(
      `${shiftsLabel(notReady)} ${notReady === 1 ? "isn't" : "aren't"} ready yet. Try again in a minute.`,
    );
  }
  return sentences;
}

/** A worker applying ("I'll choose") or accepting ("First in"). */
export function takeOutcome(
  mode: "pick" | "auto",
  results: readonly string[],
): Outcome {
  const issues = problems(results, "you");
  if (mode === "pick") {
    const applied = count(results, "applied", "already_applied");
    if (applied === 0) {
      return {
        ok: false,
        message: issues.join(" ") || "We couldn't apply for those shifts.",
      };
    }
    return {
      ok: true,
      message: [
        `Applied for ${shiftsLabel(applied)}. We'll text you if you're picked.`,
        ...issues,
      ].join(" "),
    };
  }
  const booked = count(results, "booked", "already_booked");
  if (booked === 0) {
    return {
      ok: false,
      message: issues.join(" ") || "We couldn't book those shifts.",
    };
  }
  return {
    ok: true,
    message: [`You're booked on ${shiftsLabel(booked)}.`, ...issues].join(" "),
  };
}

/** A business picking an applicant. */
export function pickOutcome(name: string, results: readonly string[]): Outcome {
  const issues = problems(results, "they");
  const booked = count(results, "booked", "already_booked");
  if (booked === 0) {
    return {
      ok: false,
      message: issues.join(" ") || `${name} has no shifts left to book.`,
    };
  }
  return {
    ok: true,
    message: [`Booked ${name} for ${shiftsLabel(booked)}.`, ...issues].join(
      " ",
    ),
  };
}
