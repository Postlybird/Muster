/** NSW public holidays. Check against the NSW Government list each year. */
export const NSW_PUBLIC_HOLIDAYS: { date: string; name: string }[] = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-26", name: "Australia Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-04", name: "Easter Saturday" },
  { date: "2026-04-05", name: "Easter Sunday" },
  { date: "2026-04-06", name: "Easter Monday" },
  { date: "2026-04-25", name: "Anzac Day" },
  { date: "2026-06-08", name: "King's Birthday" },
  { date: "2026-10-05", name: "Labour Day" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-26", name: "Boxing Day" },
  { date: "2026-12-28", name: "Additional day (Boxing Day)" },
  { date: "2027-01-01", name: "New Year's Day" },
  { date: "2027-01-26", name: "Australia Day" },
  { date: "2027-03-26", name: "Good Friday" },
  { date: "2027-03-27", name: "Easter Saturday" },
  { date: "2027-03-28", name: "Easter Sunday" },
  { date: "2027-03-29", name: "Easter Monday" },
  { date: "2027-04-25", name: "Anzac Day" },
  { date: "2027-06-14", name: "King's Birthday" },
  { date: "2027-10-04", name: "Labour Day" },
  { date: "2027-12-25", name: "Christmas Day" },
  { date: "2027-12-26", name: "Boxing Day" },
  { date: "2027-12-27", name: "Additional day (Christmas Day)" },
  { date: "2027-12-28", name: "Additional day (Boxing Day)" },
];

/**
 * PLACEHOLDER default pay rates (level 1, excluding casual loading), in
 * cents per hour. A payroll professional must set the real rates; the
 * multipliers use the table defaults (ordinary 1.25 incl. casual loading).
 */
export const DEFAULT_BASE_RATES_CENTS: Record<string, number> = {
  restoration_labourer: 2650,
  restoration_technician: 3050,
  contents_packout: 2550,
  strip_out_demolition: 2700,
  mould_remediation_assistant: 2700,
  commercial_cleaner: 2600,
  trades_assistant: 2650,
  removalist_offsider: 2600,
  // Other industries (30/10/2026): placeholders in the same way.
  food_beverage_attendant: 2600,
  bartender: 2650,
  barista: 2650,
  kitchen_hand: 2550,
  cook: 2800,
  room_attendant: 2550,
  event_staff: 2600,
  bump_in_crew: 2650,
  pick_packer: 2600,
  storeperson: 2650,
  forklift_driver: 2750,
  process_worker: 2600,
  production_packer: 2550,
  retail_assistant: 2650,
  stocktake_counter: 2600,
  merchandiser: 2650,
  builders_cleaner: 2700,
  general_labourer: 2900,
  traffic_controller: 3000,
  receptionist: 2700,
  admin_assistant: 2750,
  data_entry_operator: 2650,
};

export const RATE_CARDS_EFFECTIVE_FROM = "2026-07-01";
