import { serviceClient } from "./helpers";

/**
 * Turns quiet hours off in the test database, so messages are sent (and
 * can be checked) straight away at any time of day. The quiet hours test
 * sets its own.
 */
export default async function globalSetup() {
  const { error } = await serviceClient()
    .from("settings")
    .update({ value: { start: "00:00", end: "00:00" } })
    .eq("key", "quiet_hours");
  if (error) throw new Error(`Couldn't turn quiet hours off: ${error.message}`);
}
