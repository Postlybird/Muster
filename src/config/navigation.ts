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
};

export type NavGroup = { label?: string; items: NavItem[] };

/** Worker app: four main tabs at the bottom, the rest in the menu. */
export const workerTabs: NavItem[] = [
  {
    href: "/worker",
    label: "Home",
    icon: House,
  },
  {
    href: "/worker/shifts",
    label: "Find shifts",
    icon: Search,
  },
  {
    href: "/worker/my-shifts",
    label: "My shifts",
    icon: CalendarCheck,
  },
  {
    href: "/worker/profile",
    label: "Profile",
    icon: UserRound,
  },
];

export const workerMenu: NavItem[] = [
  {
    href: "/worker/timesheets",
    label: "Timesheets",
    icon: Timer,
  },
  {
    href: "/worker/availability",
    label: "Availability",
    icon: CalendarClock,
  },
  {
    href: "/worker/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    href: "/worker/settings",
    label: "Settings",
    icon: Settings,
  },
];

export const businessPostWork: NavItem = {
  href: "/business/post",
  label: "Post work",
  icon: Plus,
};

export const businessNav: NavGroup[] = [
  {
    items: [
      {
        href: "/business",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        href: "/business/jobs",
        label: "Jobs",
        icon: Briefcase,
      },
      {
        href: "/business/timesheets",
        label: "Timesheets",
        icon: ClipboardCheck,
      },
      {
        href: "/business/workers",
        label: "Workers",
        icon: Users,
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
      },
      {
        href: "/business/team",
        label: "Team",
        icon: UsersRound,
      },
      {
        href: "/business/invoices",
        label: "Invoices",
        icon: Receipt,
      },
      {
        href: "/business/settings",
        label: "Settings",
        icon: Settings,
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
      },
      {
        href: "/admin/workers",
        label: "Workers",
        icon: Users,
      },
      {
        href: "/admin/businesses",
        label: "Businesses",
        icon: Building2,
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
      },
      {
        href: "/admin/queues",
        label: "Queues",
        icon: Inbox,
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
      },
      {
        href: "/admin/invoices",
        label: "Invoices",
        icon: Receipt,
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
      },
      {
        href: "/admin/rates",
        label: "Rates",
        icon: Percent,
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: SlidersHorizontal,
      },
      {
        href: "/admin/agreements",
        label: "Agreements",
        icon: FileSignature,
      },
      {
        href: "/admin/licences",
        label: "Licences",
        icon: BadgeCheck,
      },
      {
        href: "/admin/team",
        label: "Admin team",
        icon: UserCog,
      },
      {
        href: "/admin/templates",
        label: "Message templates",
        icon: MessageSquareText,
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
      },
      {
        href: "/admin/audit",
        label: "Audit log",
        icon: ScrollText,
      },
    ],
  },
];

/** True when `pathname` is this item's page or one of its sub-pages. */
export function isActivePath(
  pathname: string,
  href: string,
  exact: boolean,
): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
