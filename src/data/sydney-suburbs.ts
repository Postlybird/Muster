/**
 * Greater Sydney suburbs with approximate centre points. Used by the mock
 * address lookup, the suburb picker and the demo data. Coordinates are
 * approximate (good to a few hundred metres), which is fine for distances.
 */
export type Suburb = {
  name: string;
  postcode: string;
  state: "NSW";
  lat: number;
  lng: number;
};

const s = (
  name: string,
  postcode: string,
  lat: number,
  lng: number,
): Suburb => ({
  name,
  postcode,
  state: "NSW",
  lat,
  lng,
});

export const SYDNEY_SUBURBS: Suburb[] = [
  s("Sydney", "2000", -33.8688, 151.2093),
  s("Alexandria", "2015", -33.902, 151.196),
  s("Botany", "2019", -33.946, 151.196),
  s("Mascot", "2020", -33.929, 151.191),
  s("Bondi", "2026", -33.8915, 151.2767),
  s("Leichhardt", "2040", -33.883, 151.157),
  s("Newtown", "2042", -33.897, 151.179),
  s("North Sydney", "2060", -33.839, 151.207),
  s("Lane Cove", "2066", -33.815, 151.166),
  s("Chatswood", "2067", -33.7969, 151.1803),
  s("Gordon", "2072", -33.756, 151.154),
  s("Hornsby", "2077", -33.7046, 151.0991),
  s("Manly", "2095", -33.7969, 151.2875),
  s("Dee Why", "2099", -33.752, 151.285),
  s("Brookvale", "2100", -33.766, 151.27),
  s("Mona Vale", "2103", -33.677, 151.303),
  s("Ryde", "2112", -33.815, 151.104),
  s("Macquarie Park", "2113", -33.779, 151.126),
  s("Epping", "2121", -33.773, 151.082),
  s("Silverwater", "2128", -33.837, 151.045),
  s("Ashfield", "2131", -33.889, 151.125),
  s("Burwood", "2134", -33.877, 151.104),
  s("Strathfield", "2135", -33.873, 151.094),
  s("Homebush", "2140", -33.865, 151.082),
  s("Granville", "2142", -33.833, 151.012),
  s("Auburn", "2144", -33.849, 151.033),
  s("Seven Hills", "2147", -33.774, 150.937),
  s("Blacktown", "2148", -33.771, 150.9063),
  s("Parramatta", "2150", -33.815, 151.0011),
  s("Baulkham Hills", "2153", -33.758, 150.993),
  s("Castle Hill", "2154", -33.731, 151.004),
  s("Kellyville", "2155", -33.713, 150.952),
  s("Rouse Hill", "2155", -33.682, 150.915),
  s("Smithfield", "2164", -33.854, 150.94),
  s("Wetherill Park", "2164", -33.851, 150.9),
  s("Fairfield", "2165", -33.872, 150.956),
  s("Cabramatta", "2166", -33.894, 150.938),
  s("Liverpool", "2170", -33.92, 150.9238),
  s("Moorebank", "2170", -33.943, 150.955),
  s("Prestons", "2170", -33.942, 150.871),
  s("Bankstown", "2200", -33.9173, 151.0336),
  s("Marrickville", "2204", -33.911, 151.155),
  s("Arncliffe", "2205", -33.937, 151.147),
  s("Riverwood", "2210", -33.949, 151.049),
  s("Padstow", "2211", -33.952, 151.032),
  s("Revesby", "2212", -33.95, 151.015),
  s("Rockdale", "2216", -33.952, 151.137),
  s("Kogarah", "2217", -33.963, 151.133),
  s("Hurstville", "2220", -33.967, 151.102),
  s("Miranda", "2228", -34.034, 151.101),
  s("Cronulla", "2230", -34.055, 151.153),
  s("Sutherland", "2232", -34.031, 151.058),
  s("Engadine", "2233", -34.065, 151.012),
  s("Campbelltown", "2560", -34.065, 150.8142),
  s("Ingleburn", "2565", -33.999, 150.865),
  s("Narellan", "2567", -34.041, 150.734),
  s("Camden", "2570", -34.054, 150.696),
  s("Penrith", "2750", -33.7507, 150.6877),
  s("Richmond", "2753", -33.598, 150.751),
  s("Windsor", "2756", -33.613, 150.817),
  s("St Marys", "2760", -33.762, 150.774),
  s("Mount Druitt", "2770", -33.768, 150.819),
];

/** Suburbs matching what someone has typed, best matches first. */
export function searchSuburbs(query: string, limit = 8): Suburb[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const byPostcode = /^\d{3,4}$/.test(q);
  return SYDNEY_SUBURBS.filter((sub) =>
    byPostcode
      ? sub.postcode.startsWith(q)
      : sub.name.toLowerCase().includes(q),
  )
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export function findSuburb(name: string): Suburb | undefined {
  const n = name.trim().toLowerCase();
  return SYDNEY_SUBURBS.find((sub) => sub.name.toLowerCase() === n);
}
