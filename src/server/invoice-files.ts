import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * An invoice's PDF, for the business's owners and managers or our team.
 * Read with the signed-in person's own access: row level security decides
 * who sees the invoice, and the storage policy who opens its PDF.
 */
export async function invoicePdfResponse(id: string): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const { data: invoice } = await supabase
    .from("invoices")
    .select("number, pdf_path")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) return new Response("No such invoice.", { status: 404 });
  if (!invoice.pdf_path) {
    return new Response("This invoice's PDF isn't ready yet. Try again soon.", {
      status: 404,
    });
  }
  const { data: file, error } = await supabase.storage
    .from("invoices")
    .download(invoice.pdf_path);
  if (error || !file) {
    return new Response("Couldn't open the PDF. Try again soon.", {
      status: 502,
    });
  }
  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
