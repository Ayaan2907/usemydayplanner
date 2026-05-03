"use client";

interface ThemeToggleProps {
  theme: string;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button onClick={onToggle} style={{
      background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)",
      borderRadius: 4, padding: "5px 10px", cursor: "pointer", fontSize: "0.85rem",
      fontFamily: "var(--font-sans)",
    }}>
      {theme === "dark" ? "\u2600" : "\u263D"}
    </button>
  );
}
