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

export type PayrollStatus = "not_started" | "invited" | "complete";

/** Payroll setup happens in the payroll provider's own onboarding (brief §4.1 step 9). */
export const payrollStatuses: Record<PayrollStatus, StatusInfo> = {
  not_started: {
    label: "Not started",
    tone: "neutral",
    next: "Once we've verified you, our payroll provider will email you a link to add your tax, super and bank details.",
  },
  invited: {
    label: "Waiting for you",
    tone: "warning",
    next: "Open the email from our payroll provider and finish setting up your pay.",
  },
  complete: {
    label: "Done",
    tone: "success",
    next: "Nothing to do.",
  },
};

export type JobStatus = "draft" | "posted" | "cancelled" | "completed";

/** A job, as its business sees it. */
export const jobStatuses: Record<JobStatus, StatusInfo> = {
  draft: {
    label: "Draft",
    tone: "neutral",
    next: "Finish the steps and post it when you're ready.",
  },
  posted: {
    label: "Posted",
    tone: "info",
    next: "Matching workers can see it. We'll tell you as they apply.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "danger",
    next: "Nothing more happens with this job.",
  },
  completed: {
    label: "Done",
    tone: "success",
    next: "Approve the timesheets so we can pay the workers and invoice you.",
  },
};

export type ShiftStatus = "open" | "filled" | "cancelled" | "completed";

export const shiftStatuses: Record<ShiftStatus, StatusInfo> = {
  open: {
    label: "Open",
    tone: "info",
    next: "Waiting for workers.",
  },
  filled: {
    label: "Filled",
    tone: "success",
    next: "Everyone you asked for is booked.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "danger",
    next: "This shift won't go ahead.",
  },
  completed: {
    label: "Done",
    tone: "neutral",
    next: "Check and approve the timesheets.",
  },
};

export type TimesheetStatus =
  | "submitted"
  | "approved"
  | "auto_approved"
  | "adjusted"
  | "disputed"
  | "rejected";

/** A timesheet, as the worker sees it (brief §4.6). */
export const workerTimesheetStatuses: Record<TimesheetStatus, StatusInfo> = {
  submitted: {
    label: "Waiting for approval",
    tone: "info",
    next: "The business checks your hours. If they don't in time, the hours are approved as they are.",
  },
  approved: {
    label: "Approved",
    tone: "success",
    next: "You'll be paid in the weekly pay run.",
  },
  auto_approved: {
    label: "Approved",
    tone: "success",
    next: "The business didn't check them in time, so they were approved as they were. You'll be paid in the weekly pay run.",
  },
  adjusted: {
    label: "Changed by the business",
    tone: "warning",
    next: "You'll be paid for the hours shown. If they're not right, query them and our team will look into it.",
  },
  disputed: {
    label: "With our team",
    tone: "warning",
    next: "Our team is looking into these hours and will let you know what's decided.",
  },
  rejected: {
    label: "Not paid",
    tone: "danger",
    next: "Our team found these hours weren't worked. Contact us if you think that's wrong.",
  },
};

/** A timesheet, as the business sees it. */
export const businessTimesheetStatuses: Record<TimesheetStatus, StatusInfo> = {
  submitted: {
    label: "To approve",
    tone: "info",
    next: "Approve the hours, change them, or query them with our team. If nobody does in time, they're approved as they are.",
  },
  approved: {
    label: "Approved",
    tone: "success",
    next: "They'll be on your next weekly invoice.",
  },
  auto_approved: {
    label: "Approved automatically",
    tone: "success",
    next: "Nobody approved or queried them in time. They'll be on your next weekly invoice.",
  },
  adjusted: {
    label: "Approved with changes",
    tone: "success",
    next: "The hours shown will be on your next weekly invoice. We've told the worker.",
  },
  disputed: {
    label: "With our team",
    tone: "warning",
    next: "Our team is looking into these hours and will let you both know what's decided.",
  },
  rejected: {
    label: "Not charged",
    tone: "neutral",
    next: "Our team found these hours weren't worked, so they won't be charged.",
  },
};
