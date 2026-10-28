import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const SIGNED_IN_AREAS = ["/worker", "/business", "/admin"];

function isSignedInArea(pathname: string) {
  return SIGNED_IN_AREAS.some(
    (area) => pathname === area || pathname.startsWith(`${area}/`),
  );
}

/**
 * Keeps the Supabase session fresh and sends signed-out visitors to the
 * sign-in page. This is only a first, optimistic check: every page, Server
 * Action and route handler checks access again (see src/lib/auth.ts), and
 * row level security enforces it in the database.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && isSignedInArea(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
