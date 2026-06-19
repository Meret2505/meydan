"use client";

import { useEffect, useRef } from "react";
import { markAllRead } from "@/app/actions/notifications";

export function MarkAllReadOnMount({ locale }: { locale: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    markAllRead(locale).catch(() => {});
  }, [locale]);
  return null;
}
