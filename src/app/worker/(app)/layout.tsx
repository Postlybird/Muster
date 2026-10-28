import { WorkerShell } from "@/components/layout/worker-shell";
import { requireRole } from "@/lib/auth";

/** The worker app with its bottom tabs. Onboarding has its own layout. */
export default async function WorkerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("worker");
  return <WorkerShell user={user}>{children}</WorkerShell>;
}
