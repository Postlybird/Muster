import { brand, contactLine } from "./brand";

/**
 * Every message we send people (brief §5). This registry is the source of
 * truth for what each message is, who gets it and its words: admins can
 * change a template's title and text (stored in `notification_templates`),
 * and each template's placeholders say what can go in it.
 *
 * `{{link}}`, `{{brand}}` and `{{contact}}` work in every template. Put
 * `{{link}}` at the end of a worker message: texts and emails show it, and
 * in the app and push notifications it becomes a tap instead.
 */

export type Audience = "worker" | "business" | "admin";

export type NotificationCategory =
  | "urgent_work"
  | "bookings"
  | "reminders"
  | "timesheets"
  | "tickets"
  | "account"
  | "applicants"
  | "on_the_day"
  | "safety"
  | "checks";

export type CategoryDefinition = {
  label: string;
  help: string;
  /** Always sent: it can't be turned off. */
  critical: boolean;
};

export const NOTIFICATION_CATEGORIES: Record<
  NotificationCategory,
  CategoryDefinition
> = {
  urgent_work: {
    label: "Urgent call-outs",
    help: "Urgent work near you, by text as well as in the app.",
    critical: false,
  },
  bookings: {
    label: "Bookings and cancellations",
    help: "When someone is booked, or a booking is cancelled.",
    critical: true,
  },
  reminders: {
    label: "Shift reminders",
    help: "The day before, and two hours before each shift.",
    critical: false,
  },
  timesheets: {
    label: "Timesheets",
    help: "Hours to approve, changes and queries.",
    critical: false,
  },
  tickets: {
    label: "Tickets and visa",
    help: "Before your tickets or visa expire, so you can keep working.",
    critical: true,
  },
  account: {
    label: "Your account",
    help: "Checks, approvals and anything that affects your account.",
    critical: true,
  },
  applicants: {
    label: "Applicants",
    help: "Your first applicant for a job, and when a job is fully booked.",
    critical: false,
  },
  on_the_day: {
    label: "On the day",
    help: "When someone booked hasn't clocked in.",
    critical: false,
  },
  safety: {
    label: "Safety reports",
    help: "Safety issues workers report on site.",
    critical: true,
  },
  checks: {
    label: "Compliance checks",
    help: "Bookings that no longer pass the rules, and VEVO re-checks due.",
    critical: true,
  },
};

/** The categories each kind of user can choose to hear about. */
export const CATEGORIES_FOR: Record<Audience, NotificationCategory[]> = {
  worker: [
    "urgent_work",
    "bookings",
    "reminders",
    "timesheets",
    "tickets",
    "account",
  ],
  business: ["applicants", "bookings", "on_the_day", "timesheets", "account"],
  admin: ["safety", "checks"],
};

export type TemplateDefinition = {
  audience: Audience;
  category: NotificationCategory;
  /** Its name on the admin templates page. */
  label: string;
  /** When it's sent. */
  when: string;
  /** Sent straight away, even in quiet hours. */
  urgent?: boolean;
  /** Its own placeholders, each with an example for previews. */
  values: Record<string, string>;
  /** Email subject, or the heading of a push notification. */
  title: string;
  body: string;
};

function define<V extends Record<string, string>>(
  template: Omit<TemplateDefinition, "values"> & { values: V },
) {
  return template;
}

/** Filled in for every template (examples for previews). */
export const SHARED_VALUES = {
  brand: brand.name,
  link: "https://example.com/worker/shifts/…",
  contact: contactLine(),
} as const;

export const TEMPLATES = {
  // Workers: bookings and reminders
  booked: define({
    audience: "worker",
    category: "bookings",
    label: "Booked",
    when: "A business books the worker, or they're first in.",
    values: {
      work: "Commercial cleaner",
      business: "Westside Cleaning",
      suburb: "Blacktown",
      shifts: "Wed 4 Nov, 7:00 am to 3:00 pm",
    },
    title: "You're booked",
    body: "You're booked: {{work}} for {{business}} in {{suburb}}, {{shifts}}. See the address and who to report to: {{link}}",
  }),
  shifts_cancelled: define({
    audience: "worker",
    category: "bookings",
    label: "Shifts cancelled by the business",
    when: "A business cancels shifts the worker is booked on.",
    urgent: true,
    values: {
      business: "Westside Cleaning",
      work: "Commercial cleaner",
      suburb: "Blacktown",
      shifts: "Wed 4 Nov, 7:00 am to 3:00 pm",
    },
    title: "Shift cancelled",
    body: "Cancelled: {{business}} has cancelled {{work}} in {{suburb}}, {{shifts}}. Sorry for the change. Find other work in the app.",
  }),
  removed_from_shift: define({
    audience: "worker",
    category: "bookings",
    label: "Taken off a shift by our team",
    when: "Our team takes a worker off a booked shift, say because a ticket it needs expires first.",
    urgent: true,
    values: {
      business: "Westside Cleaning",
      work: "Commercial cleaner",
      suburb: "Blacktown",
      shifts: "Wed 4 Nov, 7:00 am to 3:00 pm",
      reason: "Your White Card expires before then.",
    },
    title: "You're off a shift",
    body: "Our team has taken you off {{work}} for {{business}} in {{suburb}}, {{shifts}}. {{reason}} It doesn't count against your reliability. Your shifts: {{link}}",
  }),
  reminder_day_before: define({
    audience: "worker",
    category: "reminders",
    label: "Reminder the day before",
    when: "About 24 hours before a booked shift.",
    values: {
      work: "Commercial cleaner",
      business: "Westside Cleaning",
      when: "on Wed 4 Nov from 7:00 am",
      address: "12 Main St, Blacktown",
      report_to: "Report to Sam Lee on 0491 570 006.",
    },
    title: "Shift tomorrow",
    body: "Reminder: {{work}} for {{business}} {{when}} at {{address}}. {{report_to}} Details: {{link}}",
  }),
  reminder_soon: define({
    audience: "worker",
    category: "reminders",
    label: "Reminder two hours before",
    when: "Two hours before a booked shift.",
    urgent: true,
    values: {
      work: "Commercial cleaner",
      business: "Westside Cleaning",
      when: "today from 7:00 am",
      address: "12 Main St, Blacktown",
      report_to: "Report to Sam Lee on 0491 570 006.",
    },
    title: "Starting soon",
    body: "Starting soon: {{work}} for {{business}} {{when}} at {{address}}. {{report_to}} Details: {{link}}",
  }),
  urgent_offer: define({
    audience: "worker",
    category: "urgent_work",
    label: "Urgent call-out",
    when: "Urgent work is posted that the worker can take (if they opted in).",
    urgent: true,
    values: {
      work: "Restoration labourer",
      suburb: "Manly",
      when: "Wed 4 Nov from 7:00 am",
      pay: "About $310.50 with the call-out rate.",
      how: "First in gets it",
    },
    title: "Urgent work near you",
    body: "Urgent work: {{work}} in {{suburb}}, {{when}}. {{pay}} {{how}}: {{link}}",
  }),
  booking_at_risk: define({
    audience: "worker",
    category: "bookings",
    label: "Booking no longer passes the rules",
    when: "A booked shift won't pass the rules on the day, say because a ticket it needs expires first.",
    urgent: true,
    values: {
      work: "Commercial cleaner",
      business: "Westside Cleaning",
      when: "on Wed 4 Nov from 7:00 am",
      problem: "a ticket the job needs expires before then",
    },
    title: "Your booking needs attention",
    body: "Your booking for {{work}} with {{business}} {{when}} can't go ahead as it is: {{problem}}. Our team will be in touch. See your shift: {{link}}",
  }),

  // Workers: timesheets
  hours_changed: define({
    audience: "worker",
    category: "timesheets",
    label: "Hours changed by the business",
    when: "A business changes or enters a worker's hours.",
    values: {
      business: "Westside Cleaning",
      day: "Wed 4 Nov",
      site: "Blacktown office tower",
      hours: "7:00 am to 2:30 pm, 30 min break",
      note: '"You left at 2:30."',
    },
    title: "Your hours were changed",
    body: "{{business}} set your hours for {{day}} at {{site}} to {{hours}}. {{note}} If that's not right, query them: {{link}}",
  }),
  hours_queried: define({
    audience: "worker",
    category: "timesheets",
    label: "Hours queried by the business",
    when: "A business queries a worker's hours with our team.",
    values: {
      business: "Westside Cleaning",
      day: "Wed 4 Nov",
      site: "Blacktown office tower",
    },
    title: "Your hours were queried",
    body: "{{business}} has queried your hours for {{day}} at {{site}}. Our team will look into it. Add your side: {{link}}",
  }),
  query_settled_worker: define({
    audience: "worker",
    category: "timesheets",
    label: "Query settled (to the worker)",
    when: "Our team settles a query about hours.",
    values: {
      day: "Wed 4 Nov",
      site: "Blacktown office tower",
      outcome: "the hours are 7:00 am to 2:30 pm, 30 min break",
      resolution: "The supervisor confirmed you stayed until 2:30.",
    },
    title: "Your query is settled",
    body: "We've settled the query about your hours for {{day}} at {{site}}: {{outcome}}. {{resolution}} {{link}}",
  }),

  // Workers: tickets and visa
  ticket_expiring: define({
    audience: "worker",
    category: "tickets",
    label: "Ticket expiring",
    when: "Before a ticket expires (the expiry warning days setting).",
    values: { ticket: "White Card", date: "04/11/2026" },
    title: "Your ticket expires soon",
    body: "Your {{ticket}} expires on {{date}}. Add the renewed one so you can keep taking work that needs it: {{link}}",
  }),
  ticket_expired: define({
    audience: "worker",
    category: "tickets",
    label: "Ticket expired",
    when: "The day a ticket expires.",
    values: { ticket: "White Card", date: "04/11/2026" },
    title: "Your ticket has expired",
    body: "Your {{ticket}} expired on {{date}}. You can't take work that needs it until you add a current one: {{link}}",
  }),
  visa_expiring: define({
    audience: "worker",
    category: "tickets",
    label: "Visa expiring",
    when: "Before a worker's visa expires (the expiry warning days setting).",
    values: { date: "04/11/2026" },
    title: "Your visa expires soon",
    body: "Your visa expires on {{date}}. If you have a new one, update your right to work details so we can check it and you can keep working: {{link}}",
  }),
  visa_expired: define({
    audience: "worker",
    category: "tickets",
    label: "Visa expired",
    when: "The day a worker's visa expires.",
    values: { date: "04/11/2026" },
    title: "Your visa has expired",
    body: "Your visa expired on {{date}}, so you can't take shifts until we've checked your new one. Update your right to work details: {{link}}",
  }),

  // Workers: account
  no_show: define({
    audience: "worker",
    category: "account",
    label: "No-show recorded",
    when: "A business reports a worker didn't come.",
    values: {
      business: "Westside Cleaning",
      work: "Commercial cleaner",
      suburb: "Blacktown",
    },
    title: "No-show reported",
    body: "{{business}} reported you didn't come to {{work}} in {{suburb}}. If that's not right, contact us.",
  }),
  no_show_suspended: define({
    audience: "worker",
    category: "account",
    label: "No-show recorded, account on hold",
    when: "A no-show puts the worker's account on hold.",
    values: {
      business: "Westside Cleaning",
      work: "Commercial cleaner",
      suburb: "Blacktown",
    },
    title: "Your account is on hold",
    body: "{{business}} reported you didn't come to {{work}} in {{suburb}}. With your recent no-shows, your account is on hold and you can't take new shifts. We'll be in touch.",
  }),
  no_show_excused: define({
    audience: "worker",
    category: "account",
    label: "No-show excused",
    when: "Our team decides a reported no-show shouldn't count.",
    values: {
      business: "Westside Cleaning",
      work: "Commercial cleaner",
      suburb: "Blacktown",
    },
    title: "No-show excused",
    body: "We've looked into the no-show reported for {{work}} for {{business}} in {{suburb}}. It won't count against your reliability.",
  }),
  hold_lifted: define({
    audience: "worker",
    category: "account",
    label: "Account no longer on hold",
    when: "Our team lifts the hold on a worker's account.",
    values: {},
    title: "You can take shifts again",
    body: "Your account is no longer on hold, so you can take shifts again. Find work: {{link}}",
  }),
  photo_rejected: define({
    audience: "worker",
    category: "account",
    label: "Photo not accepted",
    when: "Our team asks a worker for a new photo.",
    values: { reason: "Your face needs to be clearly visible." },
    title: "Please change your photo",
    body: "Please change your photo: {{reason}} Open the app to upload a new one.",
  }),
  id_rejected: define({
    audience: "worker",
    category: "account",
    label: "ID not accepted",
    when: "Our team couldn't check a worker's ID.",
    values: { reason: "The photo of your licence is blurry." },
    title: "We couldn't check your ID",
    body: "We couldn't check your ID: {{reason}} Open the app to upload new photos.",
  }),
  rights_rejected: define({
    audience: "worker",
    category: "account",
    label: "Right to work not confirmed",
    when: "Our team couldn't confirm a worker's right to work.",
    values: { reason: "VEVO shows no work rights for that visa." },
    title: "We couldn't confirm your right to work",
    body: "We couldn't confirm your right to work: {{reason}} Open the app to fix it.",
  }),
  ticket_rejected: define({
    audience: "worker",
    category: "account",
    label: "Ticket not accepted",
    when: "Our team couldn't accept a ticket.",
    values: { ticket: "White Card", reason: "The card number is cut off." },
    title: "We couldn't accept your ticket",
    body: "We couldn't accept your {{ticket}}: {{reason}} Open the app to fix it.",
  }),
  ticket_verified: define({
    audience: "worker",
    category: "account",
    label: "Ticket verified",
    when: "Our team verifies a ticket for an active worker.",
    values: { ticket: "White Card" },
    title: "Ticket verified",
    body: "Your {{ticket}} is verified.",
  }),
  payroll_invite: define({
    audience: "worker",
    category: "account",
    label: "Payroll invitation",
    when: "Our team adds the worker to payroll.",
    values: {},
    title: "Check your email",
    body: "Check your email for an invitation from our payroll provider, Employment Hero, to add your tax, super and bank details.",
  }),
  activated: define({
    audience: "worker",
    category: "account",
    label: "Ready to work",
    when: "Our team activates a worker.",
    values: {},
    title: "You're ready to work",
    body: "You're verified and ready to work. Open the app to find shifts.",
  }),

  // Businesses
  first_applicant: define({
    audience: "business",
    category: "applicants",
    label: "First applicant",
    when: "The first worker applies for a job (to whoever posted it).",
    values: {
      work: "Commercial cleaner",
      site: "Blacktown office tower",
      shifts: "Wed 4 Nov, 7:00 am to 3:00 pm",
    },
    title: "Your first applicant: {{work}} at {{site}}",
    body: "Someone has applied for {{work}} at {{site}} ({{shifts}}).\n\nSee their rating, reliability and tickets, and book who you want: {{link}}",
  }),
  job_filled: define({
    audience: "business",
    category: "applicants",
    label: "All booked",
    when: "Every shift of a First in job is booked.",
    values: {
      work: "Commercial cleaner",
      site: "Blacktown office tower",
      start: "Wed 4 Nov at 7:00 am",
    },
    title: "All booked: {{work}} at {{site}}",
    body: "Every shift of {{work}} at {{site}} is now booked, starting {{start}}.\n\nSee who's coming and their mobile numbers: {{link}}",
  }),
  worker_cancelled: define({
    audience: "business",
    category: "bookings",
    label: "Worker can't make it",
    when: "A booked worker cancels.",
    values: {
      worker: "Priya P.",
      work: "Commercial cleaner",
      site: "Blacktown office tower",
      shifts: "Wed 4 Nov, 7:00 am to 3:00 pm",
    },
    title: "{{worker}} can't make it: {{work}} at {{site}}",
    body: "{{worker}} has cancelled {{shifts}} at {{site}}. We've offered the shift to other workers who match.\n\nSee who's booked: {{link}}",
  }),
  worker_removed: define({
    audience: "business",
    category: "bookings",
    label: "Worker taken off by our team",
    when: "Our team takes a booked worker off a shift.",
    values: {
      worker: "Priya P.",
      work: "Commercial cleaner",
      site: "Blacktown office tower",
      shifts: "Wed 4 Nov, 7:00 am to 3:00 pm",
    },
    title: "{{worker}} is off {{work}} at {{site}}",
    body: "Our team has taken {{worker}} off {{shifts}} at {{site}}. We've offered the shift to other workers who match.\n\nSee who's booked: {{link}}",
  }),
  possible_no_show: define({
    audience: "business",
    category: "on_the_day",
    label: "Not clocked in",
    when: "Someone booked hasn't clocked in after the start (a setting).",
    urgent: true,
    values: {
      worker: "Priya Patel",
      work: "Commercial cleaner",
      site: "Blacktown office tower",
    },
    title: "{{worker}} hasn't clocked in at {{site}}",
    body: "{{worker}} is booked for {{work}} at {{site}} but hasn't clocked in yet.\n\nIf they're there, confirm their arrival. If they haven't come, report a no-show: {{link}}",
  }),
  callout_unfilled: define({
    audience: "business",
    category: "bookings",
    label: "Call-out not taken yet",
    when: "Nobody has accepted a call-out after a while (a setting: 20 minutes to start).",
    urgent: true,
    values: {
      work: "Restoration labourer",
      site: "Granville flood job",
      when: "Sat 31 Oct from 2:00 pm",
      minutes: "20",
      reach: "12 workers",
    },
    title: "No one has taken your call-out yet",
    body: "Nobody has accepted your call-out for {{work}} at {{site}} ({{when}}) in the {{minutes}} minutes since it went to {{reach}}. It's still on offer, and our team is looking for someone too. See the job: {{link}}",
  }),
  timesheets_ready: define({
    audience: "business",
    category: "timesheets",
    label: "Hours to approve",
    when: "Workers' hours are ready (to whoever posted the job).",
    values: {
      summary: "Priya Patel at Blacktown office tower",
      hours:
        "- Priya Patel, Wed 4 Nov at Blacktown office tower: 7:00 am to 3:00 pm",
      deadline: "06/11/2026, 3:00 pm",
    },
    title: "Hours to approve: {{summary}}",
    body: "These hours are ready for you to approve:\n\n{{hours}}\n\nApprove or change them by {{deadline}}, or they'll be approved as they are. If something's wrong, query them and our team will look into it: {{link}}",
  }),
  timesheets_auto_approved: define({
    audience: "business",
    category: "timesheets",
    label: "Hours approved automatically",
    when: "Nobody approved or queried hours in time.",
    values: {
      summary: "Priya Patel's hours",
      window: "48",
      hours:
        "- Priya Patel, Wed 4 Nov at Blacktown office tower: 7:00 am to 3:00 pm",
    },
    title: "Approved automatically: {{summary}}",
    body: "Nobody approved or queried these hours within {{window}} hours, so they've been approved as they were:\n\n{{hours}}\n\nThey'll be on your next invoice. If something's wrong, contact us. See your timesheets: {{link}}",
  }),
  worker_queried_hours: define({
    audience: "business",
    category: "timesheets",
    label: "Worker queried their hours",
    when: "A worker queries approved hours.",
    values: {
      worker: "Priya Patel",
      day: "Wed 4 Nov",
      site: "Blacktown office tower",
      hours: "7:00 am to 2:30 pm",
      note: "I stayed until 3:00 to finish the floors.",
    },
    title: "{{worker}} has queried their hours at {{site}}",
    body: '{{worker}} has queried the hours approved for {{day}} at {{site}} ({{hours}}):\n\n"{{note}}"\n\nOur team will look into it and let you both know. Add your side: {{link}}',
  }),
  query_settled_business: define({
    audience: "business",
    category: "timesheets",
    label: "Query settled (to the business)",
    when: "Our team settles a query about hours.",
    values: {
      worker: "Priya Patel",
      day: "Wed 4 Nov",
      site: "Blacktown office tower",
      outcome: "the hours are 7:00 am to 2:30 pm",
      resolution: "The supervisor confirmed she left at 2:30.",
    },
    title: "Query settled: {{worker}}'s hours at {{site}}",
    body: "We've settled the query about {{worker}}'s hours for {{day}} at {{site}}: {{outcome}}.\n\n{{resolution}}\n\nSee the timesheet: {{link}}",
  }),
  business_approved: define({
    audience: "business",
    category: "account",
    label: "Business approved",
    when: "Our team approves a business (to its owners).",
    values: {
      business: "Westside Cleaning",
      next: "You can post work now: https://example.com/business/post\n\nWe invoice weekly. Invoices are due 14 days after issue.",
    },
    title: "{{business}} is approved on {{brand}}",
    body: "Good news: {{business}} is approved on {{brand}}.\n\n{{next}}\n\n{{contact}}",
  }),
  business_off_hold: define({
    audience: "business",
    category: "account",
    label: "Business no longer on hold",
    when: "Our team takes a business off hold.",
    values: {
      business: "Westside Cleaning",
      next: "You can post work now: https://example.com/business/post\n\nWe invoice weekly. Invoices are due 14 days after issue.",
    },
    title: "{{business}} is no longer on hold",
    body: "Your {{brand}} account is no longer on hold.\n\n{{next}}\n\n{{contact}}",
  }),
  business_declined: define({
    audience: "business",
    category: "account",
    label: "Business not approved",
    when: "Our team declines a business that applied.",
    values: {
      business: "Westside Cleaning",
      reason: "We need your public liability insurance details.",
    },
    title: "We can't approve {{business}} yet",
    body: "We've looked at {{business}}'s application and can't approve it yet.\n\n{{reason}}\n\n{{contact}}",
  }),
  business_on_hold: define({
    audience: "business",
    category: "account",
    label: "Business on hold",
    when: "Our team puts a business on hold, or its ABN is cancelled.",
    values: {
      business: "Westside Cleaning",
      reason: "Some invoices are overdue. Contact us to sort out payment.",
    },
    title: "{{business}} is on hold on {{brand}}",
    body: "We've put {{business}}'s {{brand}} account on hold. You can't post new work while it's on hold.\n\n{{reason}}\n\n{{contact}}",
  }),
  business_terms_set: define({
    audience: "business",
    category: "account",
    label: "Account terms set up",
    when: "Our team sets up a business's account terms.",
    values: { business: "Westside Cleaning", terms: "14" },
    title: "{{business}} can now post work on {{brand}}",
    body: "Your account terms are set up, so you can post work now: {{link}}\n\nWe invoice weekly. Invoices are due {{terms}} days after issue.\n\n{{contact}}",
  }),
  team_invite: define({
    audience: "business",
    category: "account",
    label: "Team invitation",
    when: "An owner invites someone to their business (sent to the email they entered).",
    values: {
      inviter: "Sofia Rossi",
      business: "Westside Cleaning",
      role: "a manager",
      email: "sam@example.com",
    },
    title: "{{inviter}} invited you to {{business}} on {{brand}}",
    body: "{{inviter}} has invited you to join {{business}} on {{brand}} as {{role}}.\n\nSign in with this email address ({{email}}) to accept: {{link}}",
  }),
  invoice: define({
    audience: "business",
    category: "account",
    label: "Invoice",
    when: "The weekly run raises an invoice (to the accounts email, with the PDF).",
    values: {
      greeting: "Hi Mark Davies,",
      number: "INV-1001",
      period_end: "25/10/2026",
      total: "$429.39",
      gst: "$39.04",
      due: "12/11/2026",
      account_name: "Shifta Labour Hire",
      bsb: "062-000",
      account_number: "12345678",
      questions: "Questions about it? Contact us at accounts@example.com.",
    },
    title: "Tax invoice {{number}} from {{brand}}",
    body: "{{greeting}}\n\nYour invoice {{number}} for work up to {{period_end}} is attached.\n\nAmount due: {{total}} (including GST of {{gst}}), by {{due}}.\n\nPlease pay by bank transfer to:\nAccount name: {{account_name}}\nBSB: {{bsb}}\nAccount number: {{account_number}}\nReference: {{number}}\n\nYou can see each line of it at {{link}}\n\n{{questions}}\n\n{{brand}}",
  }),

  // Our team
  safety_report: define({
    audience: "admin",
    category: "safety",
    label: "Safety report",
    when: "A worker reports a safety issue (to every admin).",
    urgent: true,
    values: {
      worker: "Priya Patel",
      work: "Commercial cleaner",
      site: "Blacktown office tower",
      business: "Westside Cleaning",
      description: "The fire exit on level 3 is blocked.",
    },
    title: "Safety issue at {{site}} ({{business}})",
    body: "{{worker}} reported a safety issue on {{work}} at {{site}}:\n\n{{description}}\n\nIt's flagged for admins in the app.",
  }),
  admin_callout_unfilled: define({
    audience: "admin",
    category: "bookings",
    label: "Call-out not taken",
    when: "Nobody has accepted a call-out after a while (to every admin).",
    urgent: true,
    values: {
      business: "Harbour Restoration",
      work: "Restoration labourer",
      site: "Granville flood job",
      when: "Sat 31 Oct from 2:00 pm",
      minutes: "20",
      reach: "12 workers",
    },
    title: "Call-out not taken: {{business}}",
    body: "Nobody has accepted {{business}}'s call-out for {{work}} at {{site}} ({{when}}) in {{minutes}} minutes. It went to {{reach}}. If you can, ring around: {{link}}",
  }),
  admin_booking_at_risk: define({
    audience: "admin",
    category: "checks",
    label: "Booking no longer passes the rules",
    when: "A booked shift won't pass the rules on the day, say because a ticket it needs expires first (to every admin).",
    urgent: true,
    values: {
      worker: "Priya Patel",
      work: "Commercial cleaner",
      business: "Westside Cleaning",
      when: "on Wed 4 Nov from 7:00 am",
      problem: "a ticket the job needs expires before then",
    },
    title: "Booking at risk: {{worker}} for {{business}}",
    body: "{{worker}} is booked for {{work}} with {{business}} {{when}}, but {{problem}}.\n\nDecide whether the booking can go ahead, and tell the business if not: {{link}}",
  }),
  vevo_recheck_due: define({
    audience: "admin",
    category: "checks",
    label: "VEVO re-check due",
    when: "A worker's right to work is due for a VEVO re-check (to every admin).",
    values: { worker: "Priya Patel", date: "04/11/2026" },
    title: "VEVO re-check due: {{worker}}",
    body: "{{worker}}'s right to work is due for a VEVO re-check by {{date}}. Check it in ImmiAccount and record the result: {{link}}",
  }),
} as const;

export type TemplateKey = keyof typeof TEMPLATES;

/** The values a template needs, by name. */
export type TemplateValues<K extends TemplateKey> = {
  [V in keyof (typeof TEMPLATES)[K]["values"]]: string;
};

export const templateKeys = Object.keys(TEMPLATES) as TemplateKey[];
