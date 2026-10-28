/**
 * Status labels in plain words, each with a visible "what happens next"
 * (brief §2). Keys match the database statuses in BRIEF.md §9; Phase 1
 * migrations create the matching enums.
 */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export type StatusInfo = {
  label: string;
  tone: Tone;
  /** What happens next, written for the person seeing the status. */
  next: string;
};

export type WorkerStatus =
  "draft" | "pending" | "active" | "suspended" | "offboarded";

export const workerStatuses: Record<WorkerStatus, StatusInfo> = {
  draft: {
    label: "Not submitted",
    tone: "neutral",
    next: "Finish the remaining steps, then submit your details for checking.",
  },
  pending: {
    label: "Being checked",
    tone: "info",
    next: "We're checking your details. We'll text you as soon as it's done.",
  },
  active: {
    label: "Active",
    tone: "success",
    next: "You can take shifts in work types where your tickets are verified.",
  },
  suspended: {
    label: "Suspended",
    tone: "danger",
    next: "You can't take new shifts for now. We'll contact you about what happens next.",
  },
  offboarded: {
    label: "Inactive",
    tone: "neutral",
    next: "Your account is closed. Contact us if you'd like to work with us again.",
  },
};

export type CheckStatus = "pending" | "verified" | "rejected" | "expired";

export const checkStatuses: Record<CheckStatus, StatusInfo> = {
  pending: {
    label: "Being checked",
    tone: "info",
    next: "We'll check this and text you when it's done.",
  },
  verified: {
    label: "Verified",
    tone: "success",
    next: "Nothing to do. We'll remind you before it expires.",
  },
  rejected: {
    label: "Needs fixing",
    tone: "danger",
    next: "Read the reason, fix it, then upload it again.",
  },
  expired: {
    label: "Expired",
    tone: "warning",
    next: "Upload the renewed version to take shifts that need it.",
  },
};

export type BusinessStatus = "draft" | "pending" | "approved" | "suspended";

export const businessStatuses: Record<BusinessStatus, StatusInfo> = {
  draft: {
    label: "Not submitted",
    tone: "neutral",
    next: "Finish setting up your account, then submit it for approval.",
  },
  pending: {
    label: "Awaiting approval",
    tone: "info",
    next: "We're reviewing your business. We'll email you when you can post work.",
  },
  approved: {
    label: "Approved",
    tone: "success",
    next: "You can post work.",
  },
  suspended: {
    label: "On hold",
    tone: "danger",
    next: "You can't post new work for now. We'll be in touch.",
  },
};
