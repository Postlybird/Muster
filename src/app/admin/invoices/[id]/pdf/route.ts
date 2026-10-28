import { invoicePdfResponse } from "@/server/invoice-files";

/** The invoice's PDF, for our team. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/admin/invoices/[id]/pdf">,
) {
  const { id } = await params;
  return invoicePdfResponse(id);
}
