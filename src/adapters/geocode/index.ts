import "server-only";

import { providerFor } from "../provider";
import { GooglePlacesGeocoder } from "./google";
import { MockGeocoder } from "./mock";
import type { Geocoder } from "./types";

export type {
  AddressSuggestion,
  GeocodedAddress,
  Geocoder,
  SuggestOptions,
} from "./types";

export function getGeocoder(): Geocoder {
  return providerFor("GEOCODER_PROVIDER", ["mock", "google"]) === "google"
    ? new GooglePlacesGeocoder()
    : new MockGeocoder();
}
