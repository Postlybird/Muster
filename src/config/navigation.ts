import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  ClipboardCheck,
  FileSignature,
  House,
  Inbox,
  LayoutDashboard,
  Library,
  MapPin,
  MessageSquareText,
  Percent,
  Plus,
  Receipt,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  UserCog,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown on the placeholder page until the real page is built. */
  description: string;
  /** Plan step (docs/plan.md) that builds this page. */
  step: string;
};

export type NavGroup = { label?: string; items: NavItem[] };

/** Worker app: four main tabs at the bottom, the rest in the menu. */
export const workerTabs: NavItem[] = [
  {
    href: "/worker",
    label: "Home",
    icon: House,
    description: "Your next shift, new offers and your verification checklist.",
    step: "1.2",
  },
  {
    href: "/worker/shifts",
    label: "Find shifts",
    icon: Search,
    description:
      "Open shifts you're eligible for, nearest and best-matched first.",
    step: "1.7",
  },
  {
    href: "/worker/my-shifts",
    label: "My shifts",
    icon: CalendarCheck,
    description:
      "Your confirmed and past shifts, with clock in and out on the day.",
    step: "1.8",
  },
  {
    href: "/worker/profile",
    label: "Profile",
    icon: UserRound,
    description: "Your details, work types and tickets.",
    step: "1.2",
  },
];

export const workerMenu: NavItem[] = [
  {
    href: "/worker/timesheets",
    label: "Timesheets",
    icon: Timer,
    description: "Hours you've worked and their approval status.",
    step: "1.11",
  },
  {
    href: "/worker/availability",
    label: "Availability",
    icon: CalendarClock,
    description:
      "When you can work, the 'available now' switch and blocked-out dates.",
    step: "1.2",
  },
  {
    href: "/worker/notifications",
    label: "Notifications",
    icon: Bell,
    description: "Messages about offers, shifts and your account.",
    step: "1.14",
  },
  {
    href: "/worker/settings",
    label: "Settings",
    icon: Settings,
    description: "How we contact you, and your account.",
    step: "1.14",
  },
];

export const businessPostWork: NavItem = {
  href: "/business/post",
  label: "Post work",
  icon: Plus,
  description:
    "Post a shift in under a minute, from a saved site, a template or your last shift.",
  step: "1.6",
};

export const businessNav: NavGroup[] = [
  {
    items: [
      {
        href: "/business",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Today's shifts, fill status and timesheets to approve.",
        step: "1.6",
      },
      {
        href: "/business/jobs",
        label: "Jobs",
        icon: Briefcase,
        description:
          "Your posted work: applicants, confirmed workers and live attendance.",
        step: "1.6",
      },
      {
        href: "/business/timesheets",
        label: "Timesheets",
        icon: ClipboardCheck,
        description:
          "Approve or dispute worked hours. Bulk approve in one click.",
        step: "1.11",
      },
      {
        href: "/business/workers",
        label: "Workers",
        icon: Users,
        description: "Your favourites, past workers and blocked workers.",
        step: "1.12",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/business/sites",
        label: "Sites",
        icon: MapPin,
        description:
          "Your work sites, access notes and default report-to contacts.",
        step: "1.4",
      },
      {
        href: "/business/team",
        label: "Team",
        icon: UsersRound,
        description: "Invite managers and site supervisors.",
        step: "1.4",
      },
      {
        href: "/business/invoices",
        label: "Invoices",
        icon: Receipt,
        description: "Weekly invoices and PDFs.",
        step: "1.13",
      },
      {
        href: "/business/settings",
        label: "Settings",
        icon: Settings,
        description: "Company details, billing contact and your agreement.",
        step: "1.4",
      },
    ],
  },
];

export const adminNav: NavGroup[] = [
  {
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "What needs attention today.",
        step: "1.15",
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        href: "/admin/verification",
        label: "Verification",
        icon: ShieldCheck,
        description:
          "Check documents beside the details entered, then approve or reject.",
        step: "1.3",
      },
      {
        href: "/admin/workers",
        label: "Workers",
        icon: Users,
        description:
          "All workers, filtered by category, ticket, suburb, status or expiry.",
        step: "1.15",
      },
      {
        href: "/admin/businesses",
        label: "Businesses",
        icon: Building2,
        description: "Businesses awaiting approval and approved businesses.",
        step: "1.4",
      },
    ],
  },
  {
    label: "Work",
    items: [
      {
        href: "/admin/shifts",
        label: "Shift board",
        icon: CalendarRange,
        description:
          "Open, filled and in-progress shifts. Unfilled shifts within 24 hours show red.",
        step: "1.15",
      },
      {
        href: "/admin/queues",
        label: "Queues",
        icon: Inbox,
        description:
          "Disputes, no-shows, safety reports, flags and suspensions.",
        step: "1.15",
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        href: "/admin/pay-runs",
        label: "Pay runs",
        icon: Banknote,
        description: "Weekly payroll export and invoicing run.",
        step: "1.13",
      },
      {
        href: "/admin/invoices",
        label: "Invoices",
        icon: Receipt,
        description: "Every invoice, its status and PDF.",
        step: "1.13",
      },
    ],
  },
  {
    label: "Setup",
    items: [
      {
        href: "/admin/catalogues",
        label: "Catalogues",
        icon: Library,
        description: "Categories, tickets, hazards and PPE.",
        step: "1.1",
      },
      {
        href: "/admin/rates",
        label: "Rates",
        icon: Percent,
        description: "Rate cards, bill rules and public holidays.",
        step: "1.1",
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: SlidersHorizontal,
        description:
          "Policies: cancellation windows, geofence, auto-approval, police check age.",
        step: "1.1",
      },
      {
        href: "/admin/agreements",
        label: "Agreements",
        icon: FileSignature,
        description:
          "Versions of the services agreement, contract and statements.",
        step: "1.1",
      },
      {
        href: "/admin/licences",
        label: "Licences",
        icon: BadgeCheck,
        description: "Our labour hire licences by state.",
        step: "1.1",
      },
      {
        href: "/admin/team",
        label: "Admin team",
        icon: UserCog,
        description: "People with admin access and their authenticator apps.",
        step: "1.3",
      },
      {
        href: "/admin/templates",
        label: "Message templates",
        icon: MessageSquareText,
        description: "Wording of texts, emails and notifications.",
        step: "1.14",
      },
    ],
  },
  {
    label: "Insight",
    items: [
      {
        href: "/admin/reports",
        label: "Reports",
        icon: BarChart3,
        description:
          "Fill rate, time to fill, no-shows, hours, revenue and margin.",
        step: "1.15",
      },
      {
        href: "/admin/audit",
        label: "Audit log",
        icon: ScrollText,
        description:
          "Who viewed, changed or verified personal records, and when.",
        step: "1.15",
      },
    ],
  },
];

const allItems: NavItem[] = [
  ...workerTabs,
  ...workerMenu,
  businessPostWork,
  ...businessNav.flatMap((g) => g.items),
  ...adminNav.flatMap((g) => g.items),
];

/** The nav entry for a path, used by placeholder pages. */
export function findNavItem(href: string): NavItem | undefined {
  return allItems.find((item) => item.href === href);
}

/** True when `pathname` is this item's page or one of its sub-pages. */
export function isActivePath(
  pathname: string,
  href: string,
  exact: boolean,
): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
