import {
  findSuburb,
  SYDNEY_SUBURBS,
  searchSuburbs,
  type Suburb,
} from "@/data/sydney-suburbs";

import type { AddressSuggestion, GeocodedAddress, Geocoder } from "./types";

type Encoded = { line1: string | null; suburb: string };

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
function suburbInText(text: string): { suburb: Suburb; before: string } | null {
  const lower = text.toLowerCase();
  const matches = SYDNEY_SUBURBS.filter((sub) =>
    new RegExp(`\\b${sub.name.toLowerCase().replace(/ /g, "\\s+")}\\b`).test(
      lower,
    ),
  ).sort((a, b) => b.name.length - a.name.length);
  const suburb = matches[0];
  if (!suburb) return null;
  const index = lower.search(
    new RegExp(`\\b${suburb.name.toLowerCase().replace(/ /g, "\\s+")}\\b`),
  );
  return { suburb, before: text.slice(0, index).replace(/[,\s]+$/, "") };
}

/**
 * Demo address lookup with no external service. Understands "12 George St,
 * Parramatta" or a suburb name, and places addresses near the suburb centre.
 */
export class MockGeocoder implements Geocoder {
  readonly name = "mock";

  async suggest(query: string): Promise<AddressSuggestion[]> {
    const text = query.trim();
    if (text.length < 2) return [];

    const found = suburbInText(text);
    if (found) {
      const line1 = found.before ? titleCase(found.before) : null;
      return [
        {
          id: encode({ line1, suburb: found.suburb.name }),
          label: label(line1, found.suburb),
        },
      ];
    }

    // No suburb typed yet: if it looks like a street address, offer it in the
    // closest-matching suburbs; otherwise treat it as a suburb search.
    if (/^\d/.test(text)) return [];
    return searchSuburbs(text, 6).map((sub) => ({
      id: encode({ line1: null, suburb: sub.name }),
      label: label(null, sub),
    }));
  }

  async resolve(id: string): Promise<GeocodedAddress | null> {
    const decoded = decode(id);
    if (!decoded) return null;
    const suburb = findSuburb(decoded.suburb);
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
