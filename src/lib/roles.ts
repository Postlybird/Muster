import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

/** Each role has its own area of the app. */
export const roleHome: Record<UserRole, string> = {
  worker: "/worker",
  business_user: "/business",
  admin: "/admin",
};

export const roleLabel: Record<UserRole, string> = {
  worker: "Worker",
  business_user: "Business",
  admin: "Admin",
};

/** Where a signed-up user lands, based on which path they came in on. */
export type SignupPath = "worker" | "business";

export function signupRoleFor(path: SignupPath | undefined): UserRole {
  return path === "business" ? "business_user" : "worker";
}
