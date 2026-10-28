import type { Metadata } from "next";

import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Contact us</h1>
      <dl className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <dt className="font-medium">Email</dt>
        <dd>
          <a href={`mailto:${brand.supportEmail}`} className="underline">
            {brand.supportEmail}
          </a>
        </dd>
        <dt className="font-medium">Phone</dt>
        <dd>
          <a
            href={`tel:${brand.supportPhone.replace(/\s/g, "")}`}
            className="underline"
          >
            {brand.supportPhone}
          </a>
        </dd>
      </dl>
    </main>
  );
}
