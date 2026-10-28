"use server";

import { revalidatePath } from "next/cache";

import { failure, success, type ActionState } from "@/lib/forms";
import {
  blockWorker,
  setFavourite,
  unblockWorker,
} from "@/server/business-workers";
import { canManage, getMyBusiness } from "@/server/businesses";
import { saveFailed } from "@/server/errors";

async function managing() {
  const { business, role } = await getMyBusiness();
  return business && canManage(role) ? business : null;
}

const NOT_ALLOWED = "Only owners and managers change favourites and blocks.";

function done(message: string): ActionState {
  revalidatePath("/business/workers");
  return success(message);
}

/** Favourites see the business's work first (brief §4.3). */
export async function addFavourite(workerId: string): Promise<ActionState> {
  const business = await managing();
  if (!business) return failure(NOT_ALLOWED);
  const { error } = await setFavourite(business.id, workerId, true);
  return error ? saveFailed(error) : done("Added to your favourites");
}

export async function removeFavourite(workerId: string): Promise<ActionState> {
  const business = await managing();
  if (!business) return failure(NOT_ALLOWED);
  const { error } = await setFavourite(business.id, workerId, false);
  return error ? saveFailed(error) : done("Removed from your favourites");
}

/** Stops a worker being offered the business's work (brief §4.7). */
export async function block(
  workerId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const business = await managing();
  if (!business) return failure(NOT_ALLOWED);
  const reason = String(formData.get("note") ?? "").trim();
  if (!reason) {
    return failure("Check the highlighted fields.", {
      note: ["Say why, for our team"],
    });
  }
  const { error } = await blockWorker(
    business.id,
    workerId,
    reason.slice(0, 500),
  );
  return error
    ? saveFailed(error)
    : done("Blocked. They won't be offered your work.");
}

export async function unblock(workerId: string): Promise<ActionState> {
  const business = await managing();
  if (!business) return failure(NOT_ALLOWED);
  const { error } = await unblockWorker(business.id, workerId);
  return error
    ? saveFailed(error)
    : done("Unblocked. They can be offered your work again.");
}
