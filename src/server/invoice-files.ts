import "server-only";

import { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Invoice and credit note PDFs, for the business's owners and managers or
 * our team. Read with the signed-in person's own access: row level security
 * decides who sees the invoice or note, and the storage policy who opens
 * its PDF.
 */
async function storedPdf(
  supabase: Client,
  path: string,
  filename: string,
): Promise<Response> {
  const { data: file, error } = await supabase.storage
    .from("invoices")
    .download(path);
  if (error || !file) {
    return new Response("Couldn't open the PDF. Try again soon.", {
      status: 502,
    });
  }
  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

async function signedIn(): Promise<Client | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

/** An invoice's PDF. */
export async function invoicePdfResponse(id: string): Promise<Response> {
  const supabase = await signedIn();
  if (!supabase) return new Response("Sign in first.", { status: 401 });
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
  return storedPdf(supabase, invoice.pdf_path, invoice.number);
}

/** A credit note's PDF, from the invoice it credits. */
export async function creditNotePdfResponse(
  invoiceId: string,
  noteId: string,
): Promise<Response> {
  const supabase = await signedIn();
  if (!supabase) return new Response("Sign in first.", { status: 401 });
  const { data: note } = await supabase
    .from("credit_notes")
    .select("number, pdf_path")
    .eq("id", noteId)
    .eq("invoice_id", invoiceId)
    .maybeSingle();
  if (!note) return new Response("No such credit note.", { status: 404 });
  if (!note.pdf_path) {
    return new Response(
      "This credit note's PDF isn't ready yet. Try again soon.",
      { status: 404 },
    );
  }
  return storedPdf(supabase, note.pdf_path, note.number);
}
