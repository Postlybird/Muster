"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      richColors
      closeButton
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          // Our status colours, which meet WCAG AA contrast.
          "--success-bg": "var(--success-soft)",
          "--success-text": "var(--success)",
          "--success-border":
            "color-mix(in oklab, var(--success) 30%, transparent)",
          "--info-bg": "var(--info-soft)",
          "--info-text": "var(--info)",
          "--info-border": "color-mix(in oklab, var(--info) 30%, transparent)",
          "--warning-bg": "var(--warning-soft)",
          "--warning-text": "var(--warning)",
          "--warning-border":
            "color-mix(in oklab, var(--warning) 30%, transparent)",
          "--error-bg": "var(--danger-soft)",
          "--error-text": "var(--destructive)",
          "--error-border":
            "color-mix(in oklab, var(--destructive) 30%, transparent)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
