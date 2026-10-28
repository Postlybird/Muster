import "server-only";

import { failure, type ActionState } from "@/lib/forms";

/**
 * A database error as a message for the person. Our own rules (locked
 * records, checks) explain themselves; anything else gets a generic message.
 */
export function saveFailed(error: {
  code?: string;
  message: string;
}): ActionState {
  if (error.code === "42501" && !/row-level security/i.test(error.message)) {
    return failure(error.message);
  }
  if (error.code === "P0001") return failure(error.message);
  console.error("Save failed", error);
  return failure("Something went wrong saving that. Please try again.");
}
