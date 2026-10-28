/**
 * Labour hire licensing by state (brief §4.9). QLD, VIC, SA and the ACT
 * license labour hire providers; NSW has promised a scheme. Check before
 * supplying workers in any of these states.
 */
export const JURISDICTIONS: {
  code: string;
  name: string;
  licenceRequired: boolean;
  licensingBody?: string;
  workerNoticeRequired?: boolean;
  notes?: string;
}[] = [
  {
    code: "NSW",
    name: "New South Wales",
    licenceRequired: false,
    notes:
      "The NSW Government has promised an all-industries scheme. Review when it's legislated.",
  },
  {
    code: "QLD",
    name: "Queensland",
    licenceRequired: true,
    licensingBody: "Labour Hire Licensing Compliance Unit (Qld)",
  },
  {
    code: "VIC",
    name: "Victoria",
    licenceRequired: true,
    licensingBody: "Labour Hire Authority (Vic)",
  },
  {
    code: "SA",
    name: "South Australia",
    licenceRequired: true,
    licensingBody: "Consumer and Business Services (SA)",
    workerNoticeRequired: true,
    notes: "Give the worker an information notice each time they're supplied.",
  },
  {
    code: "ACT",
    name: "Australian Capital Territory",
    licenceRequired: true,
    licensingBody: "Access Canberra",
  },
  { code: "WA", name: "Western Australia", licenceRequired: false },
  { code: "TAS", name: "Tasmania", licenceRequired: false },
  { code: "NT", name: "Northern Territory", licenceRequired: false },
];
