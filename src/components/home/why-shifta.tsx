import {
  BadgeDollarSign,
  CalendarSync,
  Handshake,
  Heart,
  type LucideIcon,
} from "lucide-react";

import { brand } from "@/config/brand";

const ROWS: { topic: string; agency: string; us: string }[] = [
  {
    topic: "Booking staff",
    agency: "Phone calls and emails, then waiting for a call back.",
    us: "Post a shift in about a minute. Workers who match see it straight away.",
  },
  {
    topic: "Knowing who's coming",
    agency: "Often just a name.",
    us: "A profile with ratings, reliability, the checks we've done and a note from the worker.",
  },
  {
    topic: "What you pay",
    agency: "Rates and fees that vary from job to job.",
    us: "The full price before you post, and every charge itemised on one invoice a week.",
  },
  {
    topic: "Contracts",
    agency: "Minimum terms and notice periods are common.",
    us: "No lock-in. You can stop any time with written notice.",
  },
  {
    topic: "Keeping someone great",
    agency: "A placement or transfer fee if you hire them yourself.",
    us: "Offer them a permanent job. No placement fee and no agency contract.",
  },
];

const SAVINGS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: BadgeDollarSign,
    title: "No fees on top",
    text: "No sign-up fee, no monthly fee and no placement fee. Just an hourly rate for the shifts you book.",
  },
  {
    icon: Heart,
    title: "Your favourites, first",
    text: "Workers you've liked hear about your shifts before anyone else, so you're not explaining the job again.",
  },
  {
    icon: CalendarSync,
    title: "Less admin",
    text: "Repeat a job or start from a template in a couple of taps, and approve a week of hours in one go.",
  },
  {
    icon: Handshake,
    title: "From casual to permanent",
    text: "Found someone you want to keep? Offer them a full-time role directly, with no agency contract.",
  },
];

/**
 * Why a business would use us rather than a labour hire agency (owner,
 * 31/10/2026). Every claim matches the app and the services agreement:
 * no placement fee, and either side can end it by written notice.
 */
export function WhyShifta() {
  return (
    <div className="space-y-12">
      <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
        <table className="w-full text-left text-sm sm:text-base">
          <caption className="sr-only">
            A typical agency compared with {brand.name}
          </caption>
          <thead className="bg-muted/70">
            <tr>
              <th
                scope="col"
                className="hidden p-4 font-semibold sm:table-cell"
              >
                <span className="sr-only">What matters</span>
              </th>
              <th
                scope="col"
                className="p-4 font-semibold text-muted-foreground"
              >
                A typical agency
              </th>
              <th
                scope="col"
                className="bg-primary-soft p-4 font-bold text-deep"
              >
                {brand.name}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ROWS.map((row) => (
              <tr key={row.topic} className="align-top">
                <th
                  scope="row"
                  className="hidden p-4 font-semibold text-deep sm:table-cell"
                >
                  {row.topic}
                </th>
                <td className="p-4 text-muted-foreground">
                  <span className="block font-semibold text-deep sm:hidden">
                    {row.topic}
                  </span>
                  {row.agency}
                </td>
                <td className="bg-primary-soft/50 p-4 font-medium text-foreground">
                  <span
                    aria-hidden
                    className="block font-semibold text-deep sm:hidden"
                  >
                    &nbsp;
                  </span>
                  {row.us}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SAVINGS.map((item) => (
          <li key={item.title} className="rounded-2xl border bg-card p-5">
            <item.icon className="size-8 text-primary" aria-hidden />
            <h3 className="mt-3 text-lg font-bold text-deep">{item.title}</h3>
            <p className="mt-1 text-muted-foreground">{item.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
