import type { StateCode } from "@/domain/pay";

/**
 * The cities with a page on the website. Whether we're open in one comes
 * from its state (Admin → Licences → open for work), never from here.
 */
export type City = {
  /** Its page: /locations/<slug>. */
  slug: string;
  name: string;
  state: StateCode;
};

export const CITIES: City[] = [
  { slug: "sydney", name: "Sydney", state: "NSW" },
  { slug: "melbourne", name: "Melbourne", state: "VIC" },
  { slug: "brisbane", name: "Brisbane", state: "QLD" },
  { slug: "perth", name: "Perth", state: "WA" },
  { slug: "adelaide", name: "Adelaide", state: "SA" },
  { slug: "gold-coast", name: "Gold Coast", state: "QLD" },
  { slug: "canberra", name: "Canberra", state: "ACT" },
  { slug: "newcastle", name: "Newcastle", state: "NSW" },
  { slug: "wollongong", name: "Wollongong", state: "NSW" },
  { slug: "hobart", name: "Hobart", state: "TAS" },
  { slug: "darwin", name: "Darwin", state: "NT" },
];
