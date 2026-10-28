export type AddressSuggestion = {
  /** Pass back to resolve(). */
  id: string;
  label: string;
};

export type GeocodedAddress = {
  /** Street address, e.g. "12 George Street". Null for a suburb on its own. */
  line1: string | null;
  suburb: string;
  state: string;
  postcode: string;
  lat: number;
  lng: number;
  label: string;
};

/**
 * Address autocomplete and geocoding for sites (brief §4.2) and worker home
 * suburbs. Real provider: Google Maps Places (brief §8), later Mapbox.
 */
export type SuggestOptions = {
  /** "suburb" for a worker's home suburb; "address" (default) for sites. */
  kind?: "address" | "suburb";
};

export interface Geocoder {
  readonly name: string;
  suggest(
    query: string,
    options?: SuggestOptions,
  ): Promise<AddressSuggestion[]>;
  resolve(id: string): Promise<GeocodedAddress | null>;
}
