"use client";
/**
 * T3 CONCEPT: Client-only state. This hook doesn't use tRPC — it's pure React state
 * + localStorage. The `"use client"` directive tells Next.js this runs in the browser only.
 * Without it, Next.js would try to render on the server where localStorage doesn't exist.
 */
import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("day-planner-theme") ?? "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("day-planner-theme", next);
  }

  return { theme, toggleTheme };
}
