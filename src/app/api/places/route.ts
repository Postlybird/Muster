import { NextResponse, type NextRequest } from "next/server";

import { getGeocoder } from "@/adapters/geocode";
import { getSessionUser } from "@/lib/auth";

/**
 * Suggestions for the address and suburb pickers. Signed-in users only:
 * real lookups (Google Places) cost money per request.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").slice(0, 120);
  const kind = params.get("kind") === "suburb" ? "suburb" : "address";
  const suggestions = await getGeocoder().suggest(query, { kind });
  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
