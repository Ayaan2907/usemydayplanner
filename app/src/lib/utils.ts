export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function durationLabel(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function timeToDate(dateStr: string, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(h!, m!, 0, 0);
  return d;
}

export function blockMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh! * 60 + em!) - (sh! * 60 + sm!);
}
