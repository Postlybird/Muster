import { invoicePdfResponse } from "@/server/invoice-files";

/** The invoice's PDF, for the business's owners and managers. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/business/invoices/[id]/pdf">,
) {
  const { id } = await params;
  return invoicePdfResponse(id);
}
