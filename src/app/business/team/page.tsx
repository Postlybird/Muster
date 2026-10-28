import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { formatAuPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { getMyBusiness } from "@/server/businesses";

import { InviteForm } from "./invite-form";
import { MemberRow, type Member } from "./member-row";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const { business, role, membershipId } = await getMyBusiness();
  if (!business) {
    return (
      <div className="space-y-6">
        <PageHeader title="Team" />
        <p className="text-muted-foreground">Set up your business first.</p>
      </div>
    );
  }
  const supabase = await createClient();
  const [{ data: people }, { data: sites }] = await Promise.all([
    supabase
      .from("business_users")
      .select(
        "id, role, invite_email, profile_id, profiles!business_users_profile_id_fkey(full_name, email, phone), business_user_sites(site_id)",
      )
      .eq("business_id", business.id)
      .is("archived_at", null)
      .order("created_at"),
    supabase
      .from("sites")
      .select("id, name")
      .eq("business_id", business.id)
      .is("archived_at", null)
      .order("name"),
  ]);
  const isOwner = role === "owner";
  const members: Member[] = (people ?? []).map((person) => {
    const profile = person.profiles;
    const name =
      profile?.full_name || profile?.email || person.invite_email || "Invited";
    return {
      id: person.id,
      name,
      contact: [profile?.email, formatAuPhone(profile?.phone)]
        .filter((value) => value && value !== name)
        .join(", "),
      role: person.role,
      invited: !person.profile_id,
      isMe: person.id === membershipId,
      siteIds: person.business_user_sites.map((link) => link.site_id),
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="Owners manage everything. Managers post work and approve timesheets. Supervisors look after their sites."
      />
      <ul className="max-w-3xl space-y-3">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            sites={sites ?? []}
            canEdit={isOwner}
          />
        ))}
      </ul>
      {isOwner ? (
        <section aria-labelledby="invite" className="max-w-3xl space-y-3">
          <h2 id="invite" className="text-lg font-semibold">
            Invite someone
          </h2>
          <p className="text-sm text-muted-foreground">
            We email them a link. They join your account when they sign in with
            that email address.
          </p>
          <InviteForm />
        </section>
      ) : null}
    </div>
  );
}
