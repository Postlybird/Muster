import type { Metadata } from "next";

import { RegisterPage } from "../register-page";

export const metadata: Metadata = { title: "Sign up as a worker" };

export default function RegisterWorkerPage() {
  return (
    <RegisterPage
      kind="worker"
      copy={{
        eyebrow: "For workers",
        title: "Start finding work",
        description:
          "About 2 minutes, with no quiz or video interview. You'll see shifts near you straight away.",
        switchText: "Hiring staff?",
        switchLink: {
          href: "/register/business",
          label: "Sign up as a business",
        },
        benefitsTitle: "Work that fits your week",
        benefits: [
          {
            title: "Paid every week",
            text: "Wages and super every week, with your casual loading and weekend rates.",
          },
          {
            title: "Shifts near you",
            text: "Only work you're qualified for, within the distance you choose.",
          },
          {
            title: "Get ready in your own time",
            text: "Add your ID, right to work and tickets whenever suits you. We check them, then you can start taking shifts.",
          },
        ],
      }}
    />
  );
}
