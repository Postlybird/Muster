import type { Metadata } from "next";

import { DraftPage } from "@/components/layout/draft-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return <DraftPage title="Terms of use" />;
}
