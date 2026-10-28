import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";

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
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
      style={brandVariables}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
