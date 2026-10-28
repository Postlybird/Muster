"use server";

import { revalidatePath } from "next/cache";

import {
  SHARED_VALUES,
  TEMPLATES,
  type TemplateKey,
} from "@/config/notifications";
import { templateProblems } from "@/domain/notifications";
import { requireAdmin } from "@/lib/auth";
import { failure, success, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { saveFailed } from "@/server/errors";

function revalidate(key: string) {
  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${key}`);
}

/** New wording for a message; the standard wording again if it matches. */
export async function saveTemplate(
  key: TemplateKey,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const template = TEMPLATES[key];
  if (!template) return failure("There's no such message.");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
  const allowed = [
    ...Object.keys(template.values),
    ...Object.keys(SHARED_VALUES),
  ];
  const titleProblems = !title
    ? ["Enter a title"]
    : title.length > 200
      ? ["Keep it to 200 characters"]
      : templateProblems(title, allowed);
  const bodyProblems = !body
    ? ["Enter the message"]
    : body.length > 4000
      ? ["Keep it to 4,000 characters"]
      : templateProblems(body, allowed);
  if (titleProblems.length > 0 || bodyProblems.length > 0) {
    return failure("Check the highlighted fields.", {
      title: titleProblems.length > 0 ? titleProblems : undefined,
      body: bodyProblems.length > 0 ? bodyProblems : undefined,
    });
  }
  const supabase = await createClient();
  const { error } =
    title === template.title && body === template.body
      ? await supabase.from("notification_templates").delete().eq("key", key)
      : await supabase
          .from("notification_templates")
          .upsert({ key, title, body, updated_by: user.id });
  if (error) return saveFailed(error);
  revalidate(key);
  return success("Saved. Messages sent from now on use this wording.");
}

/** Back to the standard wording. */
export async function resetTemplate(key: TemplateKey): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_templates")
    .delete()
    .eq("key", key);
  if (error) return saveFailed(error);
  revalidate(key);
  return success("Back to the standard wording.");
}
