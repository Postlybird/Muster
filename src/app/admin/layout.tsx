import { ConsoleShell } from "@/components/layout/console-shell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return (
    <ConsoleShell area="admin" areaLabel="Admin" user={user}>
      {children}
    </ConsoleShell>
  );
}
