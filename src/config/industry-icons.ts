import {
  BriefcaseBusiness,
  Car,
  Droplets,
  Factory,
  GraduationCap,
  HardHat,
  HeartHandshake,
  Leaf,
  type LucideIcon,
  Package,
  PartyPopper,
  Shield,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Truck,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";

/**
 * The icons an industry can have (its `icon` column). Admins choose one;
 * the website shows it on the industry's card and page.
 */
export const INDUSTRY_ICONS: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  briefcase: { label: "Briefcase", icon: BriefcaseBusiness },
  car: { label: "Car", icon: Car },
  droplets: { label: "Water drops", icon: Droplets },
  factory: { label: "Factory", icon: Factory },
  "graduation-cap": { label: "Graduation cap", icon: GraduationCap },
  "hard-hat": { label: "Hard hat", icon: HardHat },
  "heart-handshake": { label: "Caring hands", icon: HeartHandshake },
  leaf: { label: "Leaf", icon: Leaf },
  package: { label: "Package", icon: Package },
  "party-popper": { label: "Party popper", icon: PartyPopper },
  shield: { label: "Shield", icon: Shield },
  "shopping-bag": { label: "Shopping bag", icon: ShoppingBag },
  sparkles: { label: "Sparkles", icon: Sparkles },
  stethoscope: { label: "Stethoscope", icon: Stethoscope },
  truck: { label: "Truck", icon: Truck },
  utensils: { label: "Knife and fork", icon: UtensilsCrossed },
  wrench: { label: "Spanner", icon: Wrench },
};

/** The icon for an industry, or the briefcase if it's not one we know. */
export function industryIcon(name: string): LucideIcon {
  return (INDUSTRY_ICONS[name] ?? INDUSTRY_ICONS.briefcase!).icon;
}
