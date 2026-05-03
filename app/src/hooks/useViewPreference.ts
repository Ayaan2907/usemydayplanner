"use client";
import { useState, useEffect } from "react";

export type ViewId = "classic" | "timeline" | "chat" | "zen" | "dense";

export function useViewPreference() {
  const [view, setViewState] = useState<ViewId>("classic");

  useEffect(() => {
    const saved = localStorage.getItem("day-planner-view") as ViewId | null;
    if (saved) setViewState(saved);
  }, []);

  function setView(v: ViewId) {
    setViewState(v);
    localStorage.setItem("day-planner-view", v);
  }

  return { view, setView };
}
