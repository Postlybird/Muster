"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { INDUSTRY_ICONS } from "@/config/industry-icons";
import { requireAdmin } from "@/lib/auth";
import {
  failure,
  formBoolean,
  invalid,
  optionalText,
  requiredNumber,
  success,
  toCode,
  type ActionState,
} from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** A code that isn't taken yet: "trades_assistant", "trades_assistant_2", ... */
async function uniqueCode(
  supabase: Supabase,
  table:
    "categories" | "credential_types" | "hazards" | "industries" | "ppe_items",
  name: string,
): Promise<string> {
  const base = toCode(name);
  const { data } = await supabase
    .from(table)
    .select("code")
    .like("code", `${base}%`);
  const taken = new Set((data ?? []).map((row) => row.code));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}_${i}`)) return `${base}_${i}`;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(80),
  industry_id: z.uuid().nullable(),
  description: z.string().trim().max(500),
  police_check_required: z.boolean(),
  min_engagement_hours: requiredNumber("Enter a number of hours").pipe(
    z
      .number()
      .min(0, "Can't be negative")
      .max(12, "That's more than a full shift"),
  ),
  default_level: z.coerce.number().int().min(1).max(10),
  workers_comp_pct: z.coerce.number().min(0).max(100).nullable(),
  active: z.boolean(),
  credential_type_ids: z.array(z.uuid()),
  ppe_item_ids: z.array(z.uuid()),
});

export async function saveCategory(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const workersComp = optionalText(formData.get("workers_comp_pct"));
  const parsed = categorySchema.safeParse({
    name: formData.get("name") ?? "",
    industry_id: optionalText(formData.get("industry_id")),
    description: formData.get("description") ?? "",
    police_check_required: formBoolean(formData.get("police_check_required")),
    min_engagement_hours: formData.get("min_engagement_hours"),
    default_level: formData.get("default_level") ?? 1,
    workers_comp_pct: workersComp,
    active: formBoolean(formData.get("active")),
    credential_type_ids: formData.getAll("credential_type_ids"),
    ppe_item_ids: formData.getAll("ppe_item_ids"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const { credential_type_ids, ppe_item_ids, ...fields } = parsed.data;

  const supabase = await createClient();
  let categoryId = id;
  if (categoryId) {
    const { error } = await supabase
      .from("categories")
      .update(fields)
      .eq("id", categoryId);
    if (error) return failure(`Couldn't save: ${error.message}`);
  } else {
    const code = await uniqueCode(supabase, "categories", fields.name);
    const { data, error } = await supabase
      .from("categories")
      .insert({ ...fields, code })
      .select("id")
      .single();
    if (error) return failure(`Couldn't save: ${error.message}`);
    categoryId = data.id;
  }

  // Bring the required tickets and default PPE in line with what was ticked.
  const syncError = await syncCategoryLinks(
    supabase,
    categoryId,
    credential_type_ids,
    ppe_item_ids,
  );
  if (syncError) return failure(syncError);

  revalidatePath("/admin/catalogues/categories");
  if (!id) redirect(`/admin/catalogues/categories/${categoryId}?saved=1`);
  return success("Category saved");
}

async function syncCategoryLinks(
  supabase: Supabase,
  categoryId: string,
  credentialTypeIds: string[],
  ppeItemIds: string[],
): Promise<string | null> {
  const [{ data: currentTickets }, { data: currentPpe }] = await Promise.all([
    supabase
      .from("category_credentials")
      .select("credential_type_id")
      .eq("category_id", categoryId),
    supabase
      .from("category_ppe")
      .select("ppe_item_id")
      .eq("category_id", categoryId),
  ]);
  const haveTickets = new Set(
    (currentTickets ?? []).map((r) => r.credential_type_id),
  );
  const havePpe = new Set((currentPpe ?? []).map((r) => r.ppe_item_id));
  const wantTickets = new Set(credentialTypeIds);
  const wantPpe = new Set(ppeItemIds);

  const removeTickets = [...haveTickets].filter((t) => !wantTickets.has(t));
  const addTickets = [...wantTickets].filter((t) => !haveTickets.has(t));
  const removePpe = [...havePpe].filter((p) => !wantPpe.has(p));
  const addPpe = [...wantPpe].filter((p) => !havePpe.has(p));

  const results = await Promise.all([
    removeTickets.length
      ? supabase
          .from("category_credentials")
          .delete()
          .eq("category_id", categoryId)
          .in("credential_type_id", removeTickets)
      : null,
    addTickets.length
      ? supabase.from("category_credentials").insert(
          addTickets.map((t) => ({
            category_id: categoryId,
            credential_type_id: t,
          })),
        )
      : null,
    removePpe.length
      ? supabase
          .from("category_ppe")
          .delete()
          .eq("category_id", categoryId)
          .in("ppe_item_id", removePpe)
      : null,
    addPpe.length
      ? supabase
          .from("category_ppe")
          .insert(
            addPpe.map((p) => ({ category_id: categoryId, ppe_item_id: p })),
          )
      : null,
  ]);
  const failed = results.find((r) => r?.error);
  return failed?.error
    ? `Saved, but couldn't update the linked tickets or PPE: ${failed.error.message}`
    : null;
}

// ---------------------------------------------------------------------------
// Tickets (credential types)
// ---------------------------------------------------------------------------

const ticketSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(80),
    description: z.string().trim().max(500),
    kind: z.enum(["ticket", "licence", "police_check", "wwcc"]),
    issuer: z.string().trim().max(120).nullable(),
    state: z
      .enum(["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"])
      .nullable(),
    family: z.string().trim().max(80).nullable(),
    has_number: z.boolean(),
    has_expiry: z.boolean(),
    needs_document: z.boolean(),
    verification_method: z.enum(["manual", "register_check", "provider_api"]),
    active: z.boolean(),
  })
  .refine((ticket) => !ticket.family || ticket.state, {
    path: ["state"],
    message: "Choose the state that issues this version",
  });

export async function saveTicket(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = ticketSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    kind: formData.get("kind"),
    issuer: optionalText(formData.get("issuer")),
    state: formData.get("state") === "anywhere" ? null : formData.get("state"),
    family: optionalText(formData.get("family")),
    has_number: formBoolean(formData.get("has_number")),
    has_expiry: formBoolean(formData.get("has_expiry")),
    needs_document: formBoolean(formData.get("needs_document")),
    verification_method: formData.get("verification_method"),
    active: formBoolean(formData.get("active")),
  });
  if (!parsed.success) return invalid(parsed.error);
  // A state has one current version of each ticket.
  const refused = (error: { code: string; message: string }) =>
    error.code === "23505" && error.message.includes("family_state")
      ? failure("Check the highlighted fields.", {
          state: ["That state already has a version of this ticket"],
        })
      : failure(`Couldn't save: ${error.message}`);

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase
      .from("credential_types")
      .update(parsed.data)
      .eq("id", id);
    if (error) return refused(error);
    revalidatePath("/admin/catalogues/tickets");
    return success("Ticket saved");
  }

  const code = await uniqueCode(supabase, "credential_types", parsed.data.name);
  const { data, error } = await supabase
    .from("credential_types")
    .insert({ ...parsed.data, code })
    .select("id")
    .single();
  if (error) return refused(error);
  revalidatePath("/admin/catalogues/tickets");
  redirect(`/admin/catalogues/tickets/${data.id}?saved=1`);
}

// ---------------------------------------------------------------------------
// Archiving (catalogue entries are never deleted)
// ---------------------------------------------------------------------------

const archivable = z.enum([
  "categories",
  "credential_types",
  "hazards",
  "industries",
  "ppe_items",
]);

export async function setArchived(
  table: z.infer<typeof archivable>,
  id: string,
  archived: boolean,
): Promise<ActionState> {
  await requireAdmin();
  const parsedTable = archivable.safeParse(table);
  if (!parsedTable.success || !z.uuid().safeParse(id).success)
    return failure("Unknown item.");

  const supabase = await createClient();
  const { error } = await supabase
    .from(parsedTable.data)
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return failure(`Couldn't update: ${error.message}`);
  revalidatePath("/admin/catalogues", "layout");
  return success(archived ? "Archived" : "Restored");
}

// ---------------------------------------------------------------------------
// Industries
// ---------------------------------------------------------------------------

const industrySchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(60),
  summary: z.string().trim().min(1, "Enter a line about it").max(140),
  description: z.string().trim().max(600),
  icon: z.enum(Object.keys(INDUSTRY_ICONS) as [string, ...string[]], {
    error: "Choose an icon",
  }),
  active: z.boolean(),
});

export async function saveIndustry(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = industrySchema.safeParse({
    name: formData.get("name") ?? "",
    summary: formData.get("summary") ?? "",
    description: formData.get("description") ?? "",
    icon: formData.get("icon") ?? "",
    active: formBoolean(formData.get("active")),
  });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  let industryId = id;
  if (industryId) {
    const { error } = await supabase
      .from("industries")
      .update(parsed.data)
      .eq("id", industryId);
    if (error) return failure(`Couldn't save: ${error.message}`);
  } else {
    const code = await uniqueCode(supabase, "industries", parsed.data.name);
    const { data: last } = await supabase
      .from("industries")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("industries")
      .insert({
        ...parsed.data,
        code,
        sort_order: (last?.sort_order ?? 0) + 10,
      })
      .select("id")
      .single();
    if (error) return failure(`Couldn't save: ${error.message}`);
    industryId = data.id;
  }

  revalidatePath("/admin/catalogues/industries");
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/catalogues/industries/${industryId}?saved=1`);
  return success("Industry saved");
}

// ---------------------------------------------------------------------------
// Hazards and PPE (name plus active)
// ---------------------------------------------------------------------------

const simpleTable = z.enum(["hazards", "ppe_items"]);
const simpleSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(80),
  active: z.boolean(),
});

export async function saveSimpleItem(
  table: z.infer<typeof simpleTable>,
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsedTable = simpleTable.safeParse(table);
  if (!parsedTable.success) return failure("Unknown list.");
  const parsed = simpleSchema.safeParse({
    name: formData.get("name") ?? "",
    active: id ? formBoolean(formData.get("active")) : true,
  });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase
      .from(parsedTable.data)
      .update(parsed.data)
      .eq("id", id);
    if (error) return failure(`Couldn't save: ${error.message}`);
  } else {
    const code = await uniqueCode(supabase, parsedTable.data, parsed.data.name);
    const { data: last } = await supabase
      .from(parsedTable.data)
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from(parsedTable.data).insert({
      ...parsed.data,
      code,
      sort_order: (last?.sort_order ?? 0) + 10,
    });
    if (error) return failure(`Couldn't save: ${error.message}`);
  }
  revalidatePath(
    `/admin/catalogues/${parsedTable.data === "hazards" ? "hazards" : "ppe"}`,
  );
  return success(id ? "Saved" : "Added");
}
