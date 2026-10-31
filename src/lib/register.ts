import { Briefcase, HardHat } from "lucide-react";

/** The two ways to register (owner, 01/11/2026). */
export type RegisterKind = "worker" | "business";

/** Where each kind of account goes once its emailed code is in. */
export const REGISTER_NEXT: Record<RegisterKind, string> = {
  worker: "/worker/onboarding/start",
  business: "/business/onboarding",
};

/** The two ways to sign up, on /register and in the phone menu. */
export const SIGN_UP_CHOICES = [
  {
    href: "/register/business",
    label: "Sign up as a business",
    hint: "Hire staff",
    icon: Briefcase,
  },
  {
    href: "/register/worker",
    label: "Sign up as a worker",
    hint: "Find work",
    icon: HardHat,
  },
] as const;
