"use client";
import { useState, useEffect } from "react";
import { durationLabel } from "~/lib/utils";

/**
 * Live countdown hook. Pass target timestamp in ms, get back a ticking label.
 * Pass null to disable. Used by NowNextCards for block countdowns.
 */
export function useTimer(targetMs: number | null) {
  const [label, setLabel] = useState("--:--:--");
  const [ms, setMs] = useState(0);

  useEffect(() => {
    if (targetMs === null) { setLabel("--:--:--"); setMs(0); return; }
    const tick = () => {
      const remaining = targetMs - Date.now();
      setMs(remaining);
      setLabel(durationLabel(remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  return { label, ms };
}
