"use client";

import { useEffect, useRef } from "react";
import { getFcmToken, isFcmConfigured } from "@/lib/firebase-client";

export function FcmRegister() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    if (!isFcmConfigured()) return;
    sent.current = true;

    let cancelled = false;
    (async () => {
      const token = await getFcmToken();
      if (cancelled || !token) return;
      await fetch("/api/fcm/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
