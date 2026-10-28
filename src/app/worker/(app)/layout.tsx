import { WorkerShell } from "@/components/layout/worker-shell";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** The worker app with its bottom tabs. Onboarding has its own layout. */
export default async function WorkerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("worker");
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .is("read_at", null);
  return (
    <WorkerShell user={user} unread={count ?? 0}>
      {children}
    </WorkerShell>
  );
}
