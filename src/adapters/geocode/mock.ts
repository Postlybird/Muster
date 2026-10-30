import {
  findSuburb,
  searchSuburbs,
  SUBURBS,
  type Suburb,
} from "@/data/suburbs";

import type {
  AddressSuggestion,
  GeocodedAddress,
  Geocoder,
  SuggestOptions,
} from "./types";

type Encoded = { line1: string | null; suburb: string; state?: string };

function encode(value: Encoded): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode(id: string): Encoded | null {
  try {
    const value = JSON.parse(
      Buffer.from(id, "base64url").toString("utf8"),
    ) as Encoded;
    return typeof value.suburb === "string" ? value : null;
  } catch {
    return null;
  }
}

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

/** A stable number in [-1, 1) from a string, so the same address always lands in the same spot. */
function jitter(text: string, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return ((hash >>> 0) % 2000) / 1000 - 1;
}

function label(line1: string | null, suburb: Suburb): string {
  const place = `${suburb.name} ${suburb.state} ${suburb.postcode}`;
  return line1 ? `${line1}, ${place}` : place;
}

/** Finds the suburb named in free text, preferring the longest name ("North Sydney" over "Sydney"). */
/**
 * The suburb in typed text: the one ending last (the suburb comes after the
 * street, as in "42 Parramatta Rd, Granville"), and the longest name if two
 * end together ("North Sydney", not "Sydney").
 */
function suburbInText(
  text: string,
): { suburbs: Suburb[]; before: string } | null {
  const lower = text.toLowerCase();
  let best: { start: number; end: number; length: number } | null = null;
  let found: Suburb[] = [];
  for (const sub of SUBURBS) {
    const pattern = new RegExp(
      `\\b${sub.name.toLowerCase().replace(/ /g, "\\s+")}\\b`,
      "g",
    );
    for (const match of lower.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      const better =
        !best ||
        end > best.end ||
        (end === best.end && sub.name.length > best.length);
      if (better) {
        best = { start, end, length: sub.name.length };
        found = [sub];
      } else if (
        end === best!.end &&
        sub.name.length === best!.length &&
        !found.includes(sub)
      ) {
        found.push(sub); // The same name in another state.
      }
    }
  }
  if (!best) return null;
  // "Richmond VIC" or "Richmond 3121" picks one of the same-named suburbs.
  const after = lower.slice(best.end);
  const hinted = found.filter(
    (sub) =>
      new RegExp(`\\b${sub.state.toLowerCase()}\\b`).test(after) ||
      after.includes(sub.postcode),
  );
  return {
    suburbs: hinted.length > 0 ? hinted : found,
    before: text.slice(0, best.start).replace(/[,\s]+$/, ""),
  };
}

/**
 * Demo address lookup with no external service. Understands "12 George St,
 * Parramatta" or a suburb name anywhere in ./suburbs.ts, and places
 * addresses near the suburb centre.
 */
export class MockGeocoder implements Geocoder {
  readonly name = "mock";

  async suggest(
    query: string,
    options: SuggestOptions = {},
  ): Promise<AddressSuggestion[]> {
    const text = query.trim();
    if (text.length < 2) return [];

    if (options.kind === "suburb") {
      return searchSuburbs(text, 6).map((sub) => ({
        id: encode({ line1: null, suburb: sub.name, state: sub.state }),
        label: label(null, sub),
      }));
    }

    const found = suburbInText(text);
    if (found) {
      const line1 = found.before ? titleCase(found.before) : null;
      return found.suburbs.map((sub) => ({
        id: encode({ line1, suburb: sub.name, state: sub.state }),
        label: label(line1, sub),
      }));
    }

    // No suburb typed yet: if it looks like a street address, offer it in the
    // closest-matching suburbs; otherwise treat it as a suburb search.
    if (/^\d/.test(text)) return [];
    return searchSuburbs(text, 6).map((sub) => ({
      id: encode({ line1: null, suburb: sub.name, state: sub.state }),
      label: label(null, sub),
    }));
  }

  async resolve(id: string): Promise<GeocodedAddress | null> {
    const decoded = decode(id);
    if (!decoded) return null;
    const suburb = findSuburb(decoded.suburb, decoded.state);
    if (!suburb) return null;
    const line1 = decoded.line1;
    // Street addresses land within about 500 m of the suburb centre.
    const lat = line1 ? suburb.lat + jitter(line1, 1) * 0.0045 : suburb.lat;
    const lng = line1 ? suburb.lng + jitter(line1, 2) * 0.0055 : suburb.lng;
    return {
      line1,
      suburb: suburb.name,
      state: suburb.state,
      postcode: suburb.postcode,
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      label: label(line1, suburb),
    };
  }
}
