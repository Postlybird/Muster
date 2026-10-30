import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";

import { IndustryForm } from "../industry-form";

export const metadata: Metadata = { title: "Add an industry" };

export default async function NewIndustryPage() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Add an industry</h2>
      <IndustryForm
        values={{
          id: null,
          name: "",
          summary: "",
          description: "",
          icon: "briefcase",
          active: true,
        }}
      />
    </div>
  );
}
