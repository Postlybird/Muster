import { ConsoleShell } from "@/components/layout/console-shell";
import { requireRole } from "@/lib/auth";

export default async function BusinessLayout({
  children,
}: LayoutProps<"/business">) {
  const user = await requireRole("business_user");
  return (
    <ConsoleShell area="business" areaLabel="Business" user={user}>
      {children}
    </ConsoleShell>
  );
}
