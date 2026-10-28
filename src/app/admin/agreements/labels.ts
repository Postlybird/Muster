import type { Database } from "@/lib/supabase/database.types";

export type AgreementKind = Database["public"]["Enums"]["agreement_kind"];

export const agreementKinds: {
  kind: AgreementKind;
  label: string;
  who: string;
}[] = [
  {
    kind: "labour_hire_services",
    label: "Labour Hire Services Agreement",
    who: "Accepted by businesses during sign-up.",
  },
  {
    kind: "casual_employment_contract",
    label: "Casual employment contract",
    who: "Accepted by workers during sign-up.",
  },
  {
    kind: "fair_work_information_statement",
    label: "Fair Work Information Statement",
    who: "Given to every worker.",
  },
  {
    kind: "casual_employment_information_statement",
    label: "Casual Employment Information Statement",
    who: "Given to every worker.",
  },
  {
    kind: "privacy_collection_notice",
    label: "Privacy collection notice",
    who: "Shown at sign-up.",
  },
  {
    kind: "worker_supply_notice",
    label: "Worker supply notice",
    who: "Given to a worker each time they're supplied, in states that require it.",
  },
];

export const agreementLabel = Object.fromEntries(
  agreementKinds.map((k) => [k.kind, k.label]),
) as Record<AgreementKind, string>;
