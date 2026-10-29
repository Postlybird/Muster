import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { BUSINESS_ROLES } from "@/config/business-roles";

import { InviteForm } from "../../team/invite-form";
import { ContinueBusinessForm } from "../continue-form";
import { BusinessStepFrame, loadBusinessStep } from "../frame";

export const metadata: Metadata = { title: "Your team" };

export default async function TeamStepPage() {
  const { business } = await loadBusinessStep("team");
  if (!business) return null;
  const supabase = await createClient();
  const { data: invites } = await supabase
    .from("business_users")
    .select("id, invite_email, role")
    .eq("business_id", business.id)
    .is("profile_id", null)
    .is("archived_at", null)
    .order("created_at");

  return (
    <BusinessStepFrame
      step="team"
      completed={business.onboarding_steps}
      title="Your team"
      description="Invite the people who'll post work, pick workers or run your sites. You can do this later."
    >
      <div className="max-w-xl space-y-8">
        {(invites ?? []).length > 0 ? (
          <ul className="space-y-2">
            {(invites ?? []).map((invite) => (
              <li
                key={invite.id}
                className="rounded-lg border bg-card p-3 text-sm"
              >
                <span className="font-medium">{invite.invite_email}</span>
                <span className="block text-muted-foreground">
                  {BUSINESS_ROLES[invite.role].label} · invite sent
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <InviteForm />
        <ContinueBusinessForm step="team" />
      </div>
    </BusinessStepFrame>
  );
}
