import "server-only";

import type {
  AddressSuggestion,
  GeocodedAddress,
  Geocoder,
  SuggestOptions,
} from "./types";

const AUTOCOMPLETE = "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS = "https://places.googleapis.com/v1/places/";
const STATES = new Set(["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]);

type Kind = "address" | "suburb";

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

export type GooglePlace = {
  addressComponents?: AddressComponent[];
  location?: { latitude?: number; longitude?: number };
  formattedAddress?: string;
};

/** Google's session tokens: letters, numbers and dashes. */
export function validSession(value: string | null | undefined): string | null {
  return value && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : null;
}

/**
 * A suggestion's id carries the place, the kind of pick and the search
 * session, so the details call that ends the session is billed with it.
 */
export function encodePlaceId(
  placeId: string,
  kind: Kind,
  session: string | null,
): string {
  return `g.${Buffer.from(JSON.stringify({ p: placeId, k: kind, s: session })).toString("base64url")}`;
}

export function decodePlaceId(
  id: string,
): { placeId: string; kind: Kind; session: string | null } | null {
  if (!id.startsWith("g.")) return null;
  try {
    const value = JSON.parse(
      Buffer.from(id.slice(2), "base64url").toString("utf8"),
    ) as { p?: unknown; k?: unknown; s?: unknown };
    if (typeof value.p !== "string" || !/^[A-Za-z0-9_-]{1,512}$/.test(value.p))
      return null;
    return {
      placeId: value.p,
      kind: value.k === "suburb" ? "suburb" : "address",
      session: typeof value.s === "string" ? validSession(value.s) : null,
    };
  } catch {
    return null;
  }
}

/** "12 George St, Parramatta NSW, Australia" without the country. */
function withoutCountry(text: string): string {
  return text.replace(/,\s*Australia$/i, "").trim();
}

/**
 * Our address from a Google place: the street (with any unit), suburb,
 * state and postcode, and where it is. Null when it isn't a place we can
 * use: outside Australia's states, or (for a site) without a street and
 * postcode.
 */
export function addressFromPlace(
  place: GooglePlace,
  kind: Kind,
): GeocodedAddress | null {
  const components = place.addressComponents ?? [];
  const part = (type: string, text: "longText" | "shortText" = "longText") =>
    components.find((c) => c.types?.includes(type))?.[text]?.trim() || null;
  const suburb = part("locality") ?? part("postal_town");
  const state = part("administrative_area_level_1", "shortText");
  const postcode =
    part("postal_code") ??
    place.formattedAddress?.match(/\b(\d{4})\b(?=[^\d]*$)/)?.[1] ??
    null;
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (!suburb || !state || !STATES.has(state)) return null;
  // A site needs its postcode; a worker's suburb can do without one.
  if (!postcode && kind === "address") return null;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  let line1: string | null = null;
  if (kind === "address") {
    const street = part("route", "shortText");
    if (!street) return null;
    const number = part("street_number");
    const unit = part("subpremise");
    const prefix = number ? `${unit ? `${unit}/` : ""}${number} ` : "";
    line1 = `${prefix}${street}`;
  }
  const area = [suburb, state, postcode].filter(Boolean).join(" ");
  return {
    line1,
    suburb,
    state,
    postcode: postcode ?? "",
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
    label: line1 ? `${line1}, ${area}` : area,
  };
}

/**
 * Real address search through Google Maps Places (brief §8), chosen with
 * GEOCODER_PROVIDER=google and a GOOGLE_MAPS_API_KEY limited to the Places
 * API. Suggestions are Australian only; a suburb search offers suburbs, an
 * address search anything with a street. The details asked for (address,
 * location) are the cheapest kind.
 */
export class GooglePlacesGeocoder implements Geocoder {
  readonly name = "google";
  private readonly apiKey: string;

  constructor(
    env: Record<string, string | undefined> = process.env,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    const apiKey = env.GOOGLE_MAPS_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "Address search through Google needs GOOGLE_MAPS_API_KEY. See .env.example.",
      );
    }
    this.apiKey = apiKey;
  }

  async suggest(
    query: string,
    options: SuggestOptions = {},
  ): Promise<AddressSuggestion[]> {
    const text = query.trim();
    if (text.length < 2) return [];
    const kind: Kind = options.kind === "suburb" ? "suburb" : "address";
    const session = validSession(options.session);
    const response = await this.fetchImpl(AUTOCOMPLETE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
      },
      body: JSON.stringify({
        input: text,
        includedRegionCodes: ["au"],
        languageCode: "en-AU",
        regionCode: "au",
        ...(kind === "suburb" ? { includedPrimaryTypes: ["locality"] } : {}),
        ...(session ? { sessionToken: session } : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(`Google didn't suggest addresses (${response.status})`);
    }
    const body = (await response.json()) as {
      suggestions?: {
        placePrediction?: { placeId?: string; text?: { text?: string } };
      }[];
    };
    return (body.suggestions ?? [])
      .flatMap((suggestion) => {
        const prediction = suggestion.placePrediction;
        if (!prediction?.placeId || !prediction.text?.text) return [];
        return [
          {
            id: encodePlaceId(prediction.placeId, kind, session),
            label: withoutCountry(prediction.text.text),
          },
        ];
      })
      .slice(0, 6);
  }

  async resolve(id: string): Promise<GeocodedAddress | null> {
    const decoded = decodePlaceId(id);
    if (!decoded) return null;
    const url = new URL(DETAILS + encodeURIComponent(decoded.placeId));
    url.searchParams.set("languageCode", "en-AU");
    url.searchParams.set("regionCode", "au");
    if (decoded.session) url.searchParams.set("sessionToken", decoded.session);
    const response = await this.fetchImpl(url.toString(), {
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": "addressComponents,location,formattedAddress",
      },
    });
    if (response.status === 400 || response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Google didn't find the address (${response.status})`);
    }
    return addressFromPlace(
      (await response.json()) as GooglePlace,
      decoded.kind,
    );
  }
}
