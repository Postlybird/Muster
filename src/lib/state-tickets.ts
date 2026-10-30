/**
 * Tickets issued state by state (the RSA, working with children checks and
 * traffic control) don't carry across borders. Each state's version is its
 * own ticket in the catalogue, and the versions share a `family`. A job asks
 * for its site's state's version, and a worker is asked for their home
 * state's; matching then compares the tickets themselves.
 */

export type StateTicket = {
  id: string;
  /** The state that issues it; null if it's accepted Australia-wide. */
  state: string | null;
  /** Shared by every state's version of the same ticket. */
  family: string | null;
};

/**
 * The version of a ticket for a state: its family's version there, or the
 * ticket itself when it's accepted Australia-wide or the state has no
 * version of it. `catalogue` is the tickets in use.
 */
export function ticketForState(
  ticketId: string,
  state: string | null | undefined,
  catalogue: readonly StateTicket[],
): string {
  const ticket = catalogue.find((t) => t.id === ticketId);
  if (!ticket?.family || !state || ticket.state === state) return ticketId;
  return (
    catalogue.find((t) => t.family === ticket.family && t.state === state)
      ?.id ?? ticketId
  );
}

/** ticketForState() for each ticket, each once. */
export function ticketsForState(
  ticketIds: readonly string[],
  state: string | null | undefined,
  catalogue: readonly StateTicket[],
): string[] {
  return [
    ...new Set(ticketIds.map((id) => ticketForState(id, state, catalogue))),
  ];
}

/** Whether people in this state hold the ticket: it's accepted Australia-wide, or it's their state's. */
export function heldInState(
  ticket: Pick<StateTicket, "state">,
  state: string | null | undefined,
): boolean {
  return !ticket.state || ticket.state === state;
}
