import { cleanTags } from "@/domain/ratings";

import { failure, type ActionState } from "./forms";

/** Reads a rating form: 1 to 5 stars, tags from the list, a private note. */
export function ratingFromForm<T extends string>(
  formData: FormData,
  allowed: Readonly<Record<T, string>>,
):
  | { ok: true; score: number; tags: T[]; note: string }
  | { ok: false; state: ActionState } {
  const score = Number(formData.get("score"));
  const note = String(formData.get("note") ?? "").trim();
  const errors: Record<string, string[]> = {};
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    errors.score = ["Choose 1 to 5 stars"];
  }
  if (note.length > 1000) errors.note = ["Keep it under 1,000 characters"];
  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      state: failure("Check the highlighted fields.", errors),
    };
  }
  return {
    ok: true,
    score,
    tags: cleanTags(formData.getAll("tag").map(String), allowed),
    note,
  };
}
