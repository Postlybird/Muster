import type { StateCode } from "@/domain/pay";

import { SYDNEY_SUBURBS } from "./sydney-suburbs";

/**
 * Suburbs around Australia with approximate centre points, for the demo
 * address lookup and the suburb picker. Coordinates are approximate (good
 * to a kilometre or so), which is fine for distances. The live site needs a
 * real address service (brief §8: Google Maps Places).
 */
export type Suburb = {
  name: string;
  postcode: string;
  state: StateCode;
  lat: number;
  lng: number;
};

const in_ =
  (state: StateCode) =>
  (name: string, postcode: string, lat: number, lng: number): Suburb => ({
    name,
    postcode,
    state,
    lat,
    lng,
  });

const vic = in_("VIC");
const qld = in_("QLD");
const wa = in_("WA");
const sa = in_("SA");
const act = in_("ACT");
const tas = in_("TAS");
const nt = in_("NT");
const nsw = in_("NSW");

/** Beyond Sydney: the other capitals and the big regional centres. */
const OTHER_SUBURBS: Suburb[] = [
  // Melbourne and Victoria
  vic("Melbourne", "3000", -37.8136, 144.9631),
  vic("Southbank", "3006", -37.8226, 144.9646),
  vic("Docklands", "3008", -37.815, 144.9466),
  vic("Carlton", "3053", -37.8001, 144.9671),
  vic("Fitzroy", "3065", -37.7984, 144.978),
  vic("Richmond", "3121", -37.823, 144.998),
  vic("South Yarra", "3141", -37.838, 144.992),
  vic("St Kilda", "3182", -37.8676, 144.981),
  vic("Footscray", "3011", -37.8, 144.9),
  vic("Brunswick", "3056", -37.7667, 144.96),
  vic("Preston", "3072", -37.743, 145.008),
  vic("Box Hill", "3128", -37.819, 145.122),
  vic("Clayton", "3168", -37.915, 145.129),
  vic("Dandenong", "3175", -37.987, 145.215),
  vic("Frankston", "3199", -38.144, 145.126),
  vic("Sunshine", "3020", -37.788, 144.832),
  vic("Laverton North", "3026", -37.837, 144.788),
  vic("Tullamarine", "3043", -37.701, 144.88),
  vic("Werribee", "3030", -37.9, 144.66),
  vic("Geelong", "3220", -38.1499, 144.3617),
  vic("Ballarat", "3350", -37.5622, 143.8503),
  vic("Bendigo", "3550", -36.757, 144.2794),
  // Brisbane, the Gold Coast and Queensland
  qld("Brisbane City", "4000", -27.4698, 153.0251),
  qld("Fortitude Valley", "4006", -27.457, 153.035),
  qld("Newstead", "4006", -27.444, 153.045),
  qld("South Brisbane", "4101", -27.48, 153.017),
  qld("West End", "4101", -27.483, 153.009),
  qld("Woolloongabba", "4102", -27.488, 153.036),
  qld("Toowong", "4066", -27.485, 152.993),
  qld("Chermside", "4032", -27.385, 153.031),
  qld("Eagle Farm", "4009", -27.431, 153.086),
  qld("Rocklea", "4106", -27.539, 152.996),
  qld("Acacia Ridge", "4110", -27.588, 153.024),
  qld("Carindale", "4152", -27.503, 153.1),
  qld("Logan Central", "4114", -27.639, 153.109),
  qld("Ipswich", "4305", -27.615, 152.76),
  qld("Southport", "4215", -27.967, 153.4),
  qld("Surfers Paradise", "4217", -28.0023, 153.4145),
  qld("Broadbeach", "4218", -28.027, 153.431),
  qld("Robina", "4226", -28.07, 153.385),
  qld("Coolangatta", "4225", -28.167, 153.536),
  qld("Maroochydore", "4558", -26.658, 153.088),
  qld("Toowoomba", "4350", -27.5598, 151.9507),
  qld("Townsville", "4810", -19.259, 146.8169),
  qld("Cairns", "4870", -16.9186, 145.7781),
  // Perth and Western Australia
  wa("Perth", "6000", -31.9523, 115.8613),
  wa("Northbridge", "6003", -31.947, 115.857),
  wa("East Perth", "6004", -31.958, 115.872),
  wa("West Perth", "6005", -31.949, 115.842),
  wa("Subiaco", "6008", -31.949, 115.827),
  wa("Osborne Park", "6017", -31.9, 115.81),
  wa("Scarborough", "6019", -31.894, 115.757),
  wa("Joondalup", "6027", -31.744, 115.766),
  wa("Midland", "6056", -31.888, 116.01),
  wa("Malaga", "6090", -31.856, 115.889),
  wa("Welshpool", "6106", -31.99, 115.947),
  wa("Canning Vale", "6155", -32.06, 115.915),
  wa("Fremantle", "6160", -32.0569, 115.7439),
  wa("Rockingham", "6168", -32.277, 115.73),
  wa("Mandurah", "6210", -32.5269, 115.7217),
  // Adelaide and South Australia
  sa("Adelaide", "5000", -34.9285, 138.6007),
  sa("North Adelaide", "5006", -34.907, 138.594),
  sa("Mile End", "5031", -34.926, 138.57),
  sa("Marion", "5043", -35.01, 138.556),
  sa("Glenelg", "5045", -34.98, 138.515),
  sa("Unley", "5061", -34.95, 138.607),
  sa("Norwood", "5067", -34.921, 138.63),
  sa("Wingfield", "5013", -34.85, 138.57),
  sa("Port Adelaide", "5015", -34.846, 138.503),
  sa("Mawson Lakes", "5095", -34.81, 138.608),
  sa("Salisbury", "5108", -34.763, 138.645),
  // Canberra (ACT)
  act("Canberra", "2601", -35.2809, 149.13),
  act("Braddon", "2612", -35.272, 149.135),
  act("Barton", "2600", -35.308, 149.135),
  act("Phillip", "2606", -35.345, 149.088),
  act("Fyshwick", "2609", -35.327, 149.17),
  act("Belconnen", "2617", -35.238, 149.066),
  act("Mitchell", "2911", -35.215, 149.13),
  act("Gungahlin", "2912", -35.186, 149.133),
  act("Greenway", "2900", -35.417, 149.067),
  // Hobart and Tasmania
  tas("Hobart", "7000", -42.8821, 147.3272),
  tas("Battery Point", "7004", -42.889, 147.333),
  tas("Sandy Bay", "7005", -42.9, 147.326),
  tas("Moonah", "7009", -42.846, 147.304),
  tas("Glenorchy", "7010", -42.833, 147.275),
  tas("Bellerive", "7018", -42.875, 147.37),
  tas("Kingston", "7050", -42.976, 147.308),
  tas("Cambridge", "7170", -42.835, 147.445),
  tas("Launceston", "7250", -41.4332, 147.1441),
  // Darwin (NT)
  nt("Darwin City", "0800", -12.4634, 130.8456),
  nt("Casuarina", "0810", -12.372, 130.881),
  nt("Nightcliff", "0810", -12.383, 130.851),
  nt("Stuart Park", "0820", -12.445, 130.843),
  nt("Parap", "0820", -12.431, 130.842),
  nt("Winnellie", "0820", -12.428, 130.879),
  nt("Berrimah", "0828", -12.437, 130.92),
  nt("Palmerston City", "0830", -12.486, 130.983),
  nt("Alice Springs", "0870", -23.698, 133.8807),
  // Regional New South Wales
  nsw("Newcastle", "2300", -32.9283, 151.7817),
  nsw("Gosford", "2250", -33.425, 151.342),
  nsw("Wollongong", "2500", -34.4278, 150.8931),
  nsw("Queanbeyan", "2620", -35.353, 149.232),
];

/** Every suburb we know, Sydney's first (the demo data lives there). */
export const SUBURBS: Suburb[] = [...SYDNEY_SUBURBS, ...OTHER_SUBURBS];

/** Suburbs matching what someone has typed, best matches first. */
export function searchSuburbs(query: string, limit = 8): Suburb[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const byPostcode = /^\d{3,4}$/.test(q);
  return SUBURBS.filter((sub) =>
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

/**
 * A suburb by name, in a state if given. Some names are in more than one
 * state (Richmond NSW and Richmond VIC); without a state, Sydney's wins.
 */
export function findSuburb(name: string, state?: string): Suburb | undefined {
  const n = name.trim().toLowerCase();
  return SUBURBS.find(
    (sub) => sub.name.toLowerCase() === n && (!state || sub.state === state),
  );
}
