const SIGNED_IN_AREAS = ["/worker", "/business", "/admin"];

/** The worker, business and admin areas, which need someone signed in. */
export function isSignedInArea(pathname: string) {
  return SIGNED_IN_AREAS.some(
    (area) => pathname === area || pathname.startsWith(`${area}/`),
  );
}
