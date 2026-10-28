"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { failure, success, type ActionState } from "@/lib/forms";
import { finishInvoices, PayRunProblem, runPayRun } from "@/server/pay-runs";

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * Runs the last full week (brief §4.8): saves the payroll lines and
 * invoices, then makes and emails each invoice.
 */
export async function runPay(): Promise<ActionState> {
  const user = await requireAdmin();
  let runId: string;
  try {
    ({ runId } = await runPayRun(user.id));
  } catch (error) {
    if (error instanceof PayRunProblem) return failure(error.message);
    console.error("The pay run failed", error);
    return failure(
      "The run didn't finish. Reload the page to see whether it was saved before trying again.",
    );
  }
  revalidatePath("/admin/pay-runs");
  revalidatePath("/admin/invoices");
  redirect(`/admin/pay-runs/${runId}?ran=1`);
}

/** Makes and emails any of the run's invoices an earlier attempt didn't. */
export async function finishRun(runId: string): Promise<ActionState> {
  await requireAdmin();
  const { made, emailed, failed } = await finishInvoices(runId);
  revalidatePath(`/admin/pay-runs/${runId}`);
  revalidatePath("/admin/invoices");
  if (failed > 0) {
    return failure(
      `${plural(failed, "invoice")} still couldn't be made or sent. Try again later.`,
    );
  }
  return success(
    `Made ${plural(made, "PDF")} and emailed ${plural(emailed, "invoice")}.`,
  );
}
