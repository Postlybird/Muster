import "@fontsource-variable/figtree";
import { GeistMono } from "geist/font/mono";
import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";

import { DemoBanner } from "@/components/layout/demo-banner";
import { isDemoMode } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { brand } from "@/config/brand";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} · ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  openGraph: { siteName: brand.name, locale: "en_AU", type: "website" },
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-AU"
      className={`${GeistMono.variable} h-full`}
      style={brandVariables}
    >
      <body
        className={cn(
          "flex min-h-full flex-col font-sans",
          isDemoMode() && "[--banner-h:1.75rem]",
        )}
      >
        <DemoBanner />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
