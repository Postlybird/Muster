import type { Metadata } from "next";

import { DraftPage } from "@/components/layout/draft-page";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return <DraftPage title="Frequently asked questions" />;
}
