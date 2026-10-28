import type { Metadata } from "next";

import { DraftPage } from "@/components/layout/draft-page";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <DraftPage title="Privacy policy">
      <p>
        {brand.name} keeps personal information in Australia and only collects
        what we need to employ workers and supply them to businesses safely and
        lawfully.
      </p>
      <h2 id="collection-notice" className="scroll-mt-20 text-xl font-semibold">
        Collection notice
      </h2>
      <p className="text-muted-foreground">
        The full collection notice will explain what we collect at sign-up, why,
        who we share it with, and how to access or correct it.
      </p>
    </DraftPage>
  );
}
