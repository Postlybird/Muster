"use client";

import { useEffect } from "react";

/** Marks the messages on screen as read, once they've been shown. */
export function MarkRead({
  ids,
  action,
}: {
  ids: string[];
  action: (ids: string[]) => Promise<void>;
}) {
  const key = ids.join(",");
  useEffect(() => {
    action(key.split(",")).catch(() => undefined);
  }, [key, action]);
  return null;
}
