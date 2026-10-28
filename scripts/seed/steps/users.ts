import type { Database } from "../../../src/lib/supabase/database.types";
import { check, type SeedClient } from "../client";
import { ADMINS, BUSINESSES, WORKERS, workerFullName } from "../data/people";

type Role = Database["public"]["Enums"]["user_role"];

type Person = { email: string; fullName: string; role: Role; phone?: string };

export function demoPeople(): Person[] {
  return [
    ...ADMINS.map((a) => ({
      email: a.email,
      fullName: a.fullName,
      role: "admin" as const,
    })),
    ...BUSINESSES.flatMap((b) =>
      b.people.map((p) => ({
        email: p.email,
        fullName: p.fullName,
        role: "business_user" as const,
      })),
    ),
    ...WORKERS.map((w) => ({
      email: w.email,
      fullName: workerFullName(w),
      role: "worker" as const,
      phone: w.phone,
    })),
  ];
}

async function existingUsersByEmail(
  client: SeedClient,
): Promise<Map<string, string>> {
  const byEmail = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(`listing users: ${error.message}`);
    for (const user of data.users) {
      if (user.email) byEmail.set(user.email.toLowerCase(), user.id);
    }
    if (data.users.length < 1000) break;
  }
  return byEmail;
}

/** Creates demo logins (no emails or texts are sent) and sets their roles. */
export async function seedUsers(client: SeedClient) {
  const existing = await existingUsersByEmail(client);
  let created = 0;

  for (const person of demoPeople()) {
    let id = existing.get(person.email);
    if (!id) {
      const { data, error } = await client.auth.admin.createUser({
        email: person.email,
        email_confirm: true,
        ...(person.phone ? { phone: person.phone, phone_confirm: true } : {}),
        user_metadata: {
          full_name: person.fullName,
          signup_role:
            person.role === "business_user" ? "business_user" : "worker",
        },
      });
      if (error || !data.user)
        throw new Error(`creating ${person.email}: ${error?.message}`);
      id = data.user.id;
      created++;
    }

    // Admins can't be created through sign-up, so the role is set here.
    check(
      await client
        .from("profiles")
        .update({ role: person.role, full_name: person.fullName })
        .eq("id", id),
      `profile for ${person.email}`,
    );
  }

  return { users: demoPeople().length, newUsers: created };
}
