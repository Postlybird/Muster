import { ConsoleShell } from "@/components/layout/console-shell";
import { getMyBusiness } from "@/server/businesses";

export default async function BusinessLayout({
  children,
}: LayoutProps<"/business">) {
  const { user, role } = await getMyBusiness();
  return (
    <ConsoleShell
      area="business"
      areaLabel="Business"
      user={user}
      supervisor={role === "supervisor"}
    >
      {children}
    </ConsoleShell>
  );
}
