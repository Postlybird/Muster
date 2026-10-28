import { SectionTabs } from "@/components/admin/section-tabs";
import { PageHeader } from "@/components/page-header";

const tabs = [
  { href: "/admin/rates/rate-cards", label: "Pay rate cards" },
  { href: "/admin/rates/bill-rules", label: "Bill rules" },
  { href: "/admin/rates/holidays", label: "Public holidays" },
  { href: "/admin/rates/calculator", label: "Calculator" },
];

export default function RatesLayout({ children }: LayoutProps<"/admin/rates">) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rates"
        description="What we pay workers and what we bill businesses. Every change is recorded in the audit log."
      />
      <SectionTabs tabs={tabs} />
      {children}
    </div>
  );
}
