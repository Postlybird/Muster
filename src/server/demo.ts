import "server-only";

import { DEMO_EMAIL_DOMAIN } from "@/config/demo";
import { isDemoMode } from "@/lib/env";
import type { UserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export type DemoUser = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
};

/** Seeded demo accounts for the "Sign in as" panel. Empty unless in demo mode. */
export async function listDemoUsers(): Promise<DemoUser[]> {
  if (!isDemoMode()) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, full_name, email")
    .like("email", `%@${DEMO_EMAIL_DOMAIN}`)
    .is("archived_at", null)
    .order("full_name")
    .limit(200);

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    role: p.role,
    name: p.full_name ?? p.email ?? "Demo user",
    email: p.email ?? "",
  }));
}
