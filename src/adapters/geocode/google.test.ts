import { describe, expect, it, vi } from "vitest";

import {
  addressFromPlace,
  decodePlaceId,
  encodePlaceId,
  GooglePlacesGeocoder,
  type GooglePlace,
} from "./google";

const SESSION = "1b4e28ba-2fa1-11d2-883f-0016d3cca427";

const site: GooglePlace = {
  addressComponents: [
    { longText: "3", shortText: "3", types: ["subpremise"] },
    { longText: "42", shortText: "42", types: ["street_number"] },
    {
      longText: "Parramatta Road",
      shortText: "Parramatta Rd",
      types: ["route"],
    },
    { longText: "Granville", shortText: "Granville", types: ["locality"] },
    {
      longText: "New South Wales",
      shortText: "NSW",
      types: ["administrative_area_level_1"],
    },
    { longText: "Australia", shortText: "AU", types: ["country"] },
    { longText: "2142", shortText: "2142", types: ["postal_code"] },
  ],
  location: { latitude: -33.8327141, longitude: 151.0094322 },
  formattedAddress: "3/42 Parramatta Rd, Granville NSW 2142, Australia",
};

const suburb: GooglePlace = {
  addressComponents: [
    { longText: "Richmond", shortText: "Richmond", types: ["locality"] },
    {
      longText: "Victoria",
      shortText: "VIC",
      types: ["administrative_area_level_1"],
    },
  ],
  location: { latitude: -37.8182, longitude: 144.9988 },
  formattedAddress: "Richmond VIC 3121, Australia",
};

describe("addressFromPlace", () => {
  it("reads a street address with its unit", () => {
    expect(addressFromPlace(site, "address")).toEqual({
      line1: "3/42 Parramatta Rd",
      suburb: "Granville",
      state: "NSW",
      postcode: "2142",
      lat: -33.832714,
      lng: 151.009432,
      label: "3/42 Parramatta Rd, Granville NSW 2142",
    });
  });

  it("reads a suburb, taking the postcode from the address when it isn't given", () => {
    expect(addressFromPlace(suburb, "suburb")).toMatchObject({
      line1: null,
      suburb: "Richmond",
      state: "VIC",
      postcode: "3121",
      label: "Richmond VIC 3121",
    });
  });

  it("takes a suburb without a postcode, but not a site", () => {
    const noPostcode: GooglePlace = {
      ...suburb,
      formattedAddress: "Richmond VIC, Australia",
    };
    expect(addressFromPlace(noPostcode, "suburb")).toMatchObject({
      postcode: "",
      label: "Richmond VIC",
    });
    const siteWithout: GooglePlace = {
      ...site,
      addressComponents: site.addressComponents!.filter(
        (c) => !c.types?.includes("postal_code"),
      ),
      formattedAddress: "3/42 Parramatta Rd, Granville NSW, Australia",
    };
    expect(addressFromPlace(siteWithout, "address")).toBeNull();
  });

  it("won't take a site without a street, or a place outside the states", () => {
    expect(addressFromPlace(suburb, "address")).toBeNull();
    const auckland: GooglePlace = {
      ...site,
      addressComponents: site.addressComponents!.map((c) =>
        c.types?.includes("administrative_area_level_1")
          ? { ...c, shortText: "AUK" }
          : c,
      ),
    };
    expect(addressFromPlace(auckland, "address")).toBeNull();
  });
});

describe("place ids", () => {
  it("carry the place, the kind and the session", () => {
    const id = encodePlaceId("ChIJabc-123_x", "suburb", SESSION);
    expect(decodePlaceId(id)).toEqual({
      placeId: "ChIJabc-123_x",
      kind: "suburb",
      session: SESSION,
    });
  });

  it("refuse anything else", () => {
    expect(decodePlaceId("not-ours")).toBeNull();
    expect(decodePlaceId("g.!!!")).toBeNull();
    const evil = `g.${Buffer.from(JSON.stringify({ p: "../x?y" })).toString("base64url")}`;
    expect(decodePlaceId(evil)).toBeNull();
  });
});

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("GooglePlacesGeocoder", () => {
  it("needs a key", () => {
    expect(() => new GooglePlacesGeocoder({})).toThrow(/GOOGLE_MAPS_API_KEY/);
  });

  it("suggests Australian suburbs in the search session", async () => {
    const fetchImpl = fakeFetch(200, {
      suggestions: [
        {
          placePrediction: {
            placeId: "ChIJsuburb",
            text: { text: "Richmond VIC, Australia" },
          },
        },
        { queryPrediction: { text: { text: "richmond" } } },
      ],
    });
    const geocoder = new GooglePlacesGeocoder(
      { GOOGLE_MAPS_API_KEY: "key" },
      fetchImpl,
    );
    const suggestions = await geocoder.suggest("Richmo", {
      kind: "suburb",
      session: SESSION,
    });
    expect(suggestions).toEqual([
      {
        id: encodePlaceId("ChIJsuburb", "suburb", SESSION),
        label: "Richmond VIC",
      },
    ]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://places.googleapis.com/v1/places:autocomplete");
    expect(init.headers).toMatchObject({ "X-Goog-Api-Key": "key" });
    expect(JSON.parse(init.body as string)).toEqual({
      input: "Richmo",
      includedRegionCodes: ["au"],
      languageCode: "en-AU",
      regionCode: "au",
      includedPrimaryTypes: ["locality"],
      sessionToken: SESSION,
    });
  });

  it("doesn't call Google for a letter, or pass on a bad session", async () => {
    const fetchImpl = fakeFetch(200, { suggestions: [] });
    const geocoder = new GooglePlacesGeocoder(
      { GOOGLE_MAPS_API_KEY: "key" },
      fetchImpl,
    );
    expect(await geocoder.suggest("R")).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    await geocoder.suggest("42 Parra", { session: "<script>" });
    const body = JSON.parse(
      (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
        .body as string,
    );
    expect(body).not.toHaveProperty("sessionToken");
    expect(body).not.toHaveProperty("includedPrimaryTypes");
  });

  it("resolves the pick with the cheapest details, ending the session", async () => {
    const fetchImpl = fakeFetch(200, site);
    const geocoder = new GooglePlacesGeocoder(
      { GOOGLE_MAPS_API_KEY: "key" },
      fetchImpl,
    );
    const address = await geocoder.resolve(
      encodePlaceId("ChIJsite", "address", SESSION),
    );
    expect(address?.label).toBe("3/42 Parramatta Rd, Granville NSW 2142");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      `https://places.googleapis.com/v1/places/ChIJsite?languageCode=en-AU&regionCode=au&sessionToken=${SESSION}`,
    );
    expect(init.headers).toMatchObject({
      "X-Goog-FieldMask": "addressComponents,location,formattedAddress",
    });
  });

  it("treats a place Google doesn't know as no address", async () => {
    const geocoder = new GooglePlacesGeocoder(
      { GOOGLE_MAPS_API_KEY: "key" },
      fakeFetch(404, { error: { message: "Not found" } }),
    );
    expect(
      await geocoder.resolve(encodePlaceId("ChIJgone", "address", null)),
    ).toBeNull();
  });
});
