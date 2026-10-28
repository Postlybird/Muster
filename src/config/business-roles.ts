/** What each business role can do (brief §3), in plain words. */
export const BUSINESS_ROLES = {
  owner: {
    label: "Owner",
    description: "Everything, including the team and billing",
  },
  manager: {
    label: "Manager",
    description: "Posts work, picks workers, approves timesheets",
  },
  supervisor: {
    label: "Site supervisor",
    description: "Their sites' arrivals and timesheets",
  },
} as const;

export type BusinessRoleKey = keyof typeof BUSINESS_ROLES;
