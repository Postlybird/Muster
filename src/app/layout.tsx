import "@fontsource-variable/figtree";
import { GeistMono } from "geist/font/mono";
import type { Metadata, Viewport } from "next";
import { Suspense, type CSSProperties } from "react";

import { NavigationProgress } from "@/components/layout/navigation-progress";
import { SiteBanner } from "@/components/layout/site-banner";
import { NativeBridge } from "@/components/native/native-bridge";
import { isDemoMode } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { brand } from "@/config/brand";
import { launchNotice } from "@/server/launch";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} · ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  openGraph: { siteName: brand.name, locale: "en_AU", type: "website" },
  // The demo stays out of search results until launch (owner, 01/11/2026).
  ...(isDemoMode() ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  themeColor: brand.colours.primary,
  width: "device-width",
  initialScale: 1,
};

const brandVariables = {
  "--brand-primary": brand.colours.primary,
  "--brand-primary-foreground": brand.colours.primaryForeground,
  "--brand-accent": brand.colours.accent,
  "--brand-accent-foreground": brand.colours.accentForeground,
} as CSSProperties;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // When shifts start, while the launch notice is on (owner, 20/11/2026).
  const launchWhen = await launchNotice();
  return (
    <html
      lang="en-AU"
      className={`${GeistMono.variable} h-full`}
      style={brandVariables}
    >
      <body
        className={cn(
          "flex min-h-full flex-col font-sans",
          (isDemoMode() || launchWhen !== null) && "[--banner-h:1.75rem]",
        )}
      >
        {/* Reads the page address, so it waits for it on static pages. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <SiteBanner launchWhen={launchWhen} />
        {children}
        <Toaster />
        <NativeBridge />
      </body>
    </html>
  );
}
