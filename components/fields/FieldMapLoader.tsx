"use client";

import dynamic from "next/dynamic";

export const FieldMapLazy = dynamic(() => import("./FieldMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] rounded-2xl bg-surface border border-border animate-pulse" />
  ),
});
