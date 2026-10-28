export const kindLabels = {
  ticket: "Ticket or certificate",
  licence: "Licence",
  police_check: "Police check",
  wwcc: "Working with Children Check",
} as const;

export const verificationLabels = {
  manual: "Admin checks the document",
  register_check: "Admin checks a public register",
  provider_api: "Checked automatically by a provider",
} as const;
