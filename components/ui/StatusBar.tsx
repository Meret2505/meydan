"use client";

import { useEffect, useState } from "react";

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

interface BatteryLike {
  level: number;
  charging: boolean;
  addEventListener?: (event: string, handler: () => void) => void;
  removeEventListener?: (event: string, handler: () => void) => void;
}

export function StatusBar() {
  const [time, setTime] = useState(() => formatTime(new Date()));
  const [batteryPct, setBatteryPct] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);

  // Live clock — re-tick at the next minute boundary, then every minute.
  useEffect(() => {
    function tick() {
      setTime(formatTime(new Date()));
    }
    tick();
    const ms = 60_000 - (Date.now() % 60_000);
    const initial = setTimeout(() => {
      tick();
      const interval = setInterval(tick, 60_000);
      // chain cleanup
      (initial as unknown as { i?: NodeJS.Timeout }).i = interval;
    }, ms);
    return () => {
      const i = (initial as unknown as { i?: NodeJS.Timeout }).i;
      if (i) clearInterval(i);
      clearTimeout(initial);
    };
  }, []);

  // Battery — Chromium-only (Battery Status API). Falls back to no badge.
  useEffect(() => {
    const nav = navigator as unknown as {
      getBattery?: () => Promise<BatteryLike>;
    };
    if (typeof nav.getBattery !== "function") return;
    let battery: BatteryLike | null = null;
    let cancelled = false;
    const onChange = () => {
      if (!battery || cancelled) return;
      setBatteryPct(Math.round(battery.level * 100));
      setCharging(battery.charging);
    };
    nav.getBattery().then((b) => {
      if (cancelled) return;
      battery = b;
      onChange();
      b.addEventListener?.("levelchange", onChange);
      b.addEventListener?.("chargingchange", onChange);
    });
    return () => {
      cancelled = true;
      battery?.removeEventListener?.("levelchange", onChange);
      battery?.removeEventListener?.("chargingchange", onChange);
    };
  }, []);

  const fillWidth = batteryPct != null ? Math.max(2, (batteryPct / 100) * 13) : 11;
  const fillColor = charging
    ? "#1FD16B"
    : batteryPct != null && batteryPct <= 20
    ? "#E0556A"
    : "#F2F5F3";

  return (
    <div className="flex justify-between items-center pt-4 px-6 font-display font-bold text-[13px] text-text">
      <span suppressHydrationWarning>{time}</span>
      <span
        className="flex gap-1.5 items-center opacity-85"
        aria-label={batteryPct != null ? `${batteryPct}% battery` : "battery"}
      >
        {batteryPct != null && (
          <span className="text-[11px] font-bold tabular-nums">
            {batteryPct}%
          </span>
        )}
        <span
          className="relative inline-block"
          style={{
            width: 17,
            height: 11,
            border: "1.5px solid #F2F5F3",
            borderRadius: 2,
          }}
        >
          <span
            className="absolute top-[1px] left-[1px] rounded-[1px]"
            style={{
              height: 7,
              width: fillWidth,
              background: fillColor,
            }}
          />
        </span>
        <span
          className="inline-block rounded-[1px]"
          style={{ width: 3, height: 11, background: "#F2F5F3" }}
        />
      </span>
    </div>
  );
}
