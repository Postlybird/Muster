import { creditNotePdfResponse } from "@/server/invoice-files";

/** A credit note's PDF, for our team. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/admin/invoices/[id]/credit-notes/[noteId]/pdf">,
) {
  const { id, noteId } = await params;
  return creditNotePdfResponse(id, noteId);
}
