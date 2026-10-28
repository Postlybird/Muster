"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getEmailSender } from "@/adapters/email";
import { brand } from "@/config/brand";
import { failure, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { businessName, getMyBusiness } from "@/server/businesses";
import { saveFailed } from "@/server/errors";
import { requestOrigin } from "@/server/request";

const ROLE_WORDS = {
  owner: "an owner",
  manager: "a manager",
  supervisor: "a site supervisor",
} as const;

const inviteSchema = z.object({
  email: z.email("Enter an email address, like name@example.com"),
  role: z.enum(["owner", "manager", "supervisor"], {
    error: "Choose what they can do",
  }),
});

async function ownerOnly() {
  const mine = await getMyBusiness();
  if (!mine.business || mine.role !== "owner") return null;
  return mine;
}

async function sendInvite(
  email: string,
  role: keyof typeof ROLE_WORDS,
  inviter: string,
  business: string,
) {
  const link = new URL("/login?as=business", await requestOrigin()).toString();
  try {
    await getEmailSender().send({
      to: email,
      subject: `${inviter} invited you to ${business} on ${brand.name}`,
      text: [
        `${inviter} has invited you to join ${business} on ${brand.name} as ${ROLE_WORDS[role]}.`,
        "",
        `Sign in with this email address (${email}) to accept: ${link}`,
      ].join("\n"),
      tag: "business-invite",
    });
  } catch (error) {
    console.error("Couldn't send an invite", error);
  }
}

export async function inviteTeamMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const mine = await ownerOnly();
  if (!mine?.business) return failure("Only owners can invite people.");
  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    role: formData.get("role") ?? undefined,
  });
  if (!parsed.success) {
    return failure(
      "Check the highlighted fields.",
      z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    );
  }
  const { email, role } = parsed.data;
  if (email === mine.user.email) {
    return failure("That's you. Invite someone else.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("business_users")
    .insert({ business_id: mine.business.id, role, invite_email: email });
  if (error) {
    if (error.code === "23505") {
      return failure("You've already invited that email address.");
    }
    return saveFailed(error);
  }
  await sendInvite(
    email,
    role,
    mine.user.fullName ?? "Your colleague",
    businessName(mine.business),
  );
  revalidatePath("/business", "layout");
  return success(`Invite sent to ${email}`);
}

export async function resendInvite(memberId: string): Promise<ActionState> {
  const mine = await ownerOnly();
  if (!mine?.business) return failure("Only owners can invite people.");
  const supabase = await createClient();
  const { data: invite } = await supabase
    .from("business_users")
    .select("invite_email, role, profile_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!invite?.invite_email || invite.profile_id) {
    return failure("That invite has already been accepted.");
  }
  await sendInvite(
    invite.invite_email,
    invite.role,
    mine.user.fullName ?? "Your colleague",
    businessName(mine.business),
  );
  return success(`Invite sent again to ${invite.invite_email}`);
}

export async function updateTeamMember(
  memberId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const mine = await ownerOnly();
  if (!mine?.business) return failure("Only owners can change the team.");
  const role = z
    .enum(["owner", "manager", "supervisor"])
    .safeParse(formData.get("role") ?? undefined);
  if (!role.success) return failure("Choose what they can do.");
  const siteIds = formData.getAll("site_ids").map(String);

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_users")
    .update({ role: role.data })
    .eq("id", memberId);
  if (error) return saveFailed(error);

  // Supervisors' sites: bring the list in line with what was ticked.
  const { data: current } = await supabase
    .from("business_user_sites")
    .select("site_id")
    .eq("business_user_id", memberId);
  const have = new Set((current ?? []).map((row) => row.site_id));
  const want = new Set(role.data === "supervisor" ? siteIds : []);
  const add = [...want].filter((id) => !have.has(id));
  const remove = [...have].filter((id) => !want.has(id));
  if (add.length > 0) {
    const { error: addError } = await supabase
      .from("business_user_sites")
      .insert(add.map((site_id) => ({ business_user_id: memberId, site_id })));
    if (addError) return saveFailed(addError);
  }
  if (remove.length > 0) {
    const { error: removeError } = await supabase
      .from("business_user_sites")
      .delete()
      .eq("business_user_id", memberId)
      .in("site_id", remove);
    if (removeError) return saveFailed(removeError);
  }
  revalidatePath("/business/team");
  return success("Saved");
}

export async function removeTeamMember(memberId: string): Promise<ActionState> {
  const mine = await ownerOnly();
  if (!mine?.business) return failure("Only owners can change the team.");
  if (memberId === mine.membershipId) {
    return failure("You can't remove yourself.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("business_users")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) return saveFailed(error);
  revalidatePath("/business", "layout");
  return success("Removed from the team");
}
