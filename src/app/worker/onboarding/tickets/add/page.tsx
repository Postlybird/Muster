import { redirect } from "next/navigation";

/** The "Add another ticket" picker posts here (works without JavaScript). */
export default async function AddTicketPage({
  searchParams,
}: PageProps<"/worker/onboarding/tickets/add">) {
  const { code } = await searchParams;
  const value = typeof code === "string" ? code : "";
  redirect(
    /^[a-z][a-z0-9_]*$/.test(value)
      ? `/worker/onboarding/tickets/${value}`
      : "/worker/onboarding/tickets",
  );
}
