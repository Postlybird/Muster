import { creditNotePdfResponse } from "@/server/invoice-files";

/** A credit note's PDF, for the business's owners and managers. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/business/invoices/[id]/credit-notes/[noteId]/pdf">,
) {
  const { id, noteId } = await params;
  return creditNotePdfResponse(id, noteId);
}
