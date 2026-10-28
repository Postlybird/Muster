import "server-only";

import { providerFor } from "../provider";
import { MockGeocoder } from "./mock";
import type { Geocoder } from "./types";

export type {
  AddressSuggestion,
  GeocodedAddress,
  Geocoder,
  SuggestOptions,
} from "./types";

export function getGeocoder(): Geocoder {
  providerFor("GEOCODER_PROVIDER", ["mock"]);
  return new MockGeocoder();
}
