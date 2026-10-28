import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { isDemoEmail } from "@/config/demo";
import { isDemoMode } from "@/lib/env";
import { roleHome, type UserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  role: UserRole;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  /** "aal2" once the user has used their authenticator app this session. */
  aal: string | null;
};

/**
 * The signed-in user, or null. The session token is verified (not just
 * decoded) and the profile is read under RLS. Cached for the request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const aal = typeof data.claims.aal === "string" ? data.claims.aal : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, phone, archived_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.archived_at) return null;

  return {
    id: profile.id,
    role: profile.role,
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    aal,
  };
});

/** Redirects to sign-in if nobody is signed in. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return user;
}

/** Redirects users without one of these roles to their own area. */
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(roleHome[user.role]);
  }
  return user;
}

/**
 * Admins must also use their authenticator app (the database checks this
 * too). Seeded demo admins skip it in demo mode, matching the demo data.
 */
export function adminNeedsSecondFactor(user: SessionUser): boolean {
  return (
    user.role === "admin" &&
    user.aal !== "aal2" &&
    !(isDemoMode() && isDemoEmail(user.email))
  );
}

/** For admin pages and actions: an admin who has used their second factor. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireRole("admin");
  if (adminNeedsSecondFactor(user)) redirect("/mfa");
  return user;
}
