import { describe, expect, it } from "vitest";

import { availableAtStart, firstShown } from "./matching";

const weekdays = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  start: "07:00",
  end: "17:00",
}));

describe("who's told about urgent work", () => {
  it("is anyone whose weekly hours cover the start", () => {
    expect(availableAtStart(weekdays, 3, 8 * 60)).toBe(true); // Wed 8 am
    expect(availableAtStart(weekdays, 3, 17 * 60)).toBe(false); // Wed 5 pm
    expect(availableAtStart(weekdays, 6, 9 * 60)).toBe(false); // Sat 9 am
  });

  it("follows an overnight window past midnight", () => {
    const nights = [{ weekday: 5, start: "22:00", end: "06:00" }];
    expect(availableAtStart(nights, 5, 23 * 60)).toBe(true); // Fri 11 pm
    expect(availableAtStart(nights, 6, 2 * 60)).toBe(true); // Sat 2 am
    expect(availableAtStart(nights, 6, 7 * 60)).toBe(false); // Sat 7 am
    // Sunday's window carries into Monday.
    const sunday = [{ weekday: 7, start: "20:00", end: "04:00" }];
    expect(availableAtStart(sunday, 1, 3 * 60)).toBe(true);
  });
});

describe("when a worker first sees a shift", () => {
  const postedAt = new Date("2026-11-02T00:00:00Z");
  const hourLater = new Date("2026-11-02T01:00:00Z");
  const base = {
    postedAt,
    favouritesFirstMinutes: 60,
    favourite: false,
    favouriteCanTake: true,
    shownBefore: null,
  };

  it("gives favourites a head start", () => {
    expect(firstShown({ ...base, favourite: true })).toEqual(postedAt);
    expect(firstShown(base)).toEqual(hourLater);
  });

  it("shows everyone straight away without a head start", () => {
    expect(firstShown({ ...base, favouritesFirstMinutes: null })).toEqual(
      postedAt,
    );
  });

  it("doesn't hold work back when no favourite can take it", () => {
    expect(firstShown({ ...base, favouriteCanTake: false })).toEqual(postedAt);
  });

  it("never hides a shift someone has already been shown", () => {
    expect(firstShown({ ...base, shownBefore: postedAt })).toEqual(postedAt);
    // A later time from an earlier run doesn't delay it either.
    expect(
      firstShown({
        ...base,
        favouriteCanTake: false,
        shownBefore: hourLater,
      }),
    ).toEqual(postedAt);
  });
});
