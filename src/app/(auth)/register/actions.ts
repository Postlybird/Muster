"use server";

import { z } from "zod";

import { isValidAbn, normaliseAbn } from "@/adapters/abn";
import { normaliseAuMobile } from "@/lib/phone";
import { REGISTER_NEXT, type RegisterKind } from "@/lib/register";
import { signupRoleFor } from "@/lib/roles";
import { cleanEmail, sendEmailCode } from "@/server/email-codes";

/**
 * Registering (owner, 01/11/2026): a short form, then the same emailed code
 * as signing in. Workers give their name and email; businesses add a mobile
 * and their ABN, which we look up once the email is confirmed.
 */
export type RegisterFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  abn?: string;
};

export type RegisterResult =
  | { ok: true; destination: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<keyof RegisterFields, string>>;
    };

const name = z.string().trim().min(1).max(60);

export async function sendRegisterCode(
  kind: RegisterKind,
  fields: RegisterFields,
  captchaToken?: string,
): Promise<RegisterResult> {
  const errors: Partial<Record<keyof RegisterFields, string>> = {};
  const first = name.safeParse(fields.firstName);
  const last = name.safeParse(fields.lastName);
  if (!first.success) errors.firstName = "Enter your first name";
  if (!last.success) errors.lastName = "Enter your last name";
  const email = cleanEmail(fields.email ?? "");
  if (!email) errors.email = "Enter an email address, like name@example.com";

  const data: Record<string, string> = {
    signup_role: signupRoleFor(kind),
  };
  if (kind === "business") {
    const phone = normaliseAuMobile(fields.phone ?? "");
    if (!phone) {
      errors.phone = "Enter an Australian mobile number, like 0412 345 678";
    } else {
      data.contact_phone = phone;
    }
    const abn = normaliseAbn(fields.abn ?? "");
    if (!isValidAbn(abn)) {
      errors.abn = "That isn't a valid ABN. Check the 11 digits";
    } else {
      data.abn = abn;
    }
  }
  if (!first.success || !last.success || Object.keys(errors).length > 0) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: errors,
    };
  }

  data.first_name = first.data;
  data.last_name = last.data;
  data.full_name = `${first.data} ${last.data}`;
  return sendEmailCode({
    email: email!,
    data,
    next: REGISTER_NEXT[kind],
    captchaToken:
      typeof captchaToken === "string"
        ? captchaToken.slice(0, 4096)
        : undefined,
  });
}
