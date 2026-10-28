import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { roleHome, type UserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  role: UserRole;
  fullName: string | null;
  email: string | null;
  phone: string | null;
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
