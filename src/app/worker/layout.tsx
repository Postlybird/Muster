import { WorkerShell } from "@/components/layout/worker-shell";
import { requireRole } from "@/lib/auth";

export default async function WorkerLayout({
  children,
}: LayoutProps<"/worker">) {
  const user = await requireRole("worker");
  return <WorkerShell user={user}>{children}</WorkerShell>;
}
