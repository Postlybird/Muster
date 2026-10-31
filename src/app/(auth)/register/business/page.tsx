import type { Metadata } from "next";

import { RegisterPage } from "../register-page";

export const metadata: Metadata = { title: "Sign up as a business" };

export default function RegisterBusinessPage() {
  return (
    <RegisterPage
      kind="business"
      copy={{
        eyebrow: "For businesses",
        title: "Create your business account",
        description:
          "Free to join and about a minute. Then post your first shift while we check your account.",
        switchText: "Looking for work?",
        switchLink: { href: "/register/worker", label: "Sign up as a worker" },
        benefitsTitle: "Staff when you need them",
        benefits: [
          {
            title: "Checked and ready to work",
            text: "We check every worker's ID, right to work and tickets before their first shift.",
          },
          {
            title: "No fees to join",
            text: "No sign-up, monthly or placement fees: an hourly rate for each worker, shown before you post.",
          },
          {
            title: "You're in control",
            text: "Choose who comes, keep your favourites first in line, and block anyone you'd rather not have back.",
          },
        ],
      }}
    />
  );
}
