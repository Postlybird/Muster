"use client";

import { usePathname } from "next/navigation";

import { isSignedInArea } from "@/lib/signed-in-areas";

/**
 * The launch notice in the top bar: on the website, an invitation to sign
 * up; inside the app, where everyone has, just when shifts start.
 */
export function LaunchBannerText({
  start,
  banner,
  bannerShort,
}: {
  start: string;
  banner: string;
  bannerShort: string;
}) {
  const pathname = usePathname();
  if (isSignedInArea(pathname)) return start;
  return (
    <>
      <span className="sm:hidden">{bannerShort}</span>
      <span className="hidden sm:inline">{banner}</span>
    </>
  );
}
