/**
 * The shift board (brief §6): shifts under way, shifts still needing
 * workers, and filled ones. A shift starting within 24 hours that isn't
 * fully booked needs attention (shown red).
 */

export type BoardShift = {
  startsAt: Date;
  headcount: number;
  booked: number;
};

export type BoardGroup = "in_progress" | "needs_workers" | "filled";

export const ATTENTION_HOURS = 24;

export function boardGroup(shift: BoardShift, now: Date): BoardGroup {
  if (shift.startsAt <= now) return "in_progress";
  return shift.booked < shift.headcount ? "needs_workers" : "filled";
}

export function needsAttention(shift: BoardShift, now: Date): boolean {
  const until = shift.startsAt.getTime() - now.getTime();
  return (
    shift.booked < shift.headcount &&
    until > 0 &&
    until <= ATTENTION_HOURS * 3_600_000
  );
}
