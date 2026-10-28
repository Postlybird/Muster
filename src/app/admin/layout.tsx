import { ConsoleShell } from "@/components/layout/console-shell";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole("admin");
  return (
    <ConsoleShell area="admin" areaLabel="Admin" user={user}>
      {children}
    </ConsoleShell>
  );
}
