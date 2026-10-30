"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import {
  failure,
  formBoolean,
  invalid,
  optionalText,
  success,
  type ActionState,
} from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

const jurisdictionSchema = z.object({
  open_for_work: z.boolean(),
  licence_required: z.boolean(),
  worker_notice_required: z.boolean(),
  show_licence_on_invoice: z.boolean(),
  licensing_body: z.string().trim().max(150).nullable(),
  notes: z.string().trim().max(1000),
});

export async function saveJurisdiction(
  code: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  if (!(STATES as readonly string[]).includes(code))
    return failure("Unknown state.");
  const parsed = jurisdictionSchema.safeParse({
    open_for_work: formBoolean(formData.get("open_for_work")),
    licence_required: formBoolean(formData.get("licence_required")),
    worker_notice_required: formBoolean(formData.get("worker_notice_required")),
    show_licence_on_invoice: formBoolean(
      formData.get("show_licence_on_invoice"),
    ),
    licensing_body: optionalText(formData.get("licensing_body")),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("jurisdictions")
    .update(parsed.data)
    .eq("code", code);
  if (error) return failure(`Couldn't save: ${error.message}`);
  revalidatePath("/admin/licences");
  return success(`${code} saved`);
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

const licenceSchema = z
  .object({
    jurisdiction: z.enum(STATES, { error: "Choose a state" }),
    licence_number: z
      .string()
      .trim()
      .min(1, "Enter the licence number")
      .max(60),
    holder_name: z
      .string()
      .trim()
      .min(1, "Enter the licence holder's name")
      .max(150),
    issued_on: isoDate.nullable(),
    expires_on: isoDate.nullable(),
    status: z.enum(["active", "expired", "suspended", "cancelled"]),
    notes: z.string().trim().max(1000),
  })
  .refine((v) => !v.issued_on || !v.expires_on || v.expires_on >= v.issued_on, {
    path: ["expires_on"],
    message: "Must be after the issue date",
  });

export async function saveLicence(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = licenceSchema.safeParse({
    jurisdiction: formData.get("jurisdiction"),
    licence_number: formData.get("licence_number") ?? "",
    holder_name: formData.get("holder_name") ?? "",
    issued_on: optionalText(formData.get("issued_on")),
    expires_on: optionalText(formData.get("expires_on")),
    status: formData.get("status") ?? "active",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("licences").update(parsed.data).eq("id", id)
    : await supabase.from("licences").insert(parsed.data);
  if (error) return failure(`Couldn't save: ${error.message}`);
  revalidatePath("/admin/licences");
  return success(id ? "Licence saved" : "Licence added");
}
