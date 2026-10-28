import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { HolidayList } from "./holiday-list";

export const metadata: Metadata = { title: "Public holidays" };

export default async function HolidaysPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_holidays")
    .select("id, state, date, name")
    .order("date");

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-muted-foreground">
        Hours worked on these days are paid and billed at the public holiday
        rate for the state the site is in. Check the list against the state
        government&apos;s list each year.
      </p>
      <HolidayList holidays={data ?? []} />
    </div>
  );
}
