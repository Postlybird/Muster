import { SectionTabs } from "@/components/admin/section-tabs";
import { PageHeader } from "@/components/page-header";

const tabs = [
  { href: "/admin/catalogues/categories", label: "Work categories" },
  { href: "/admin/catalogues/tickets", label: "Tickets" },
  { href: "/admin/catalogues/hazards", label: "Hazards" },
  { href: "/admin/catalogues/ppe", label: "PPE" },
];

export default function CataloguesLayout({
  children,
}: LayoutProps<"/admin/catalogues">) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalogues"
        description="Everything trade-specific lives here, so new trades need no code changes."
      />
      <SectionTabs tabs={tabs} />
      {children}
    </div>
  );
}
