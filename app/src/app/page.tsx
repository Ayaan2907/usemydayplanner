"use client";
/**
 * T3 CONCEPT: page.tsx is the route entry point.
 *
 * In T3's App Router:
 * - page.tsx = the component that renders for this URL
 * - layout.tsx = wraps all pages with providers (TRPCReactProvider)
 * - The tRPC provider in layout.tsx makes `api` available to all client components
 *
 * This page is a thin router:
 * 1. Calls shared hooks (useSchedule, useTheme, useViewPreference)
 * 2. Renders the active view component
 * 3. Renders the global header + chat drawer
 *
 * Each view receives the same props — they just render differently.
 */
import { useState, useCallback } from "react";
import { useSchedule } from "~/hooks/useSchedule";
import { useTheme } from "~/hooks/useTheme";
import { useViewPreference } from "~/hooks/useViewPreference";
import { ViewSwitcher } from "~/components/shared/ViewSwitcher";
import { ThemeToggle } from "~/components/shared/ThemeToggle";
import { LiveClock } from "~/components/shared/LiveClock";
import { ChatDrawer } from "~/components/chat/ChatDrawer";
import { ClassicView } from "~/components/views/ClassicView";
import { TimelineView } from "~/components/views/TimelineView";
import { ChatView } from "~/components/views/ChatView";
import { ZenView } from "~/components/views/ZenView";
import { DenseView } from "~/components/views/DenseView";
import { todayStr } from "~/lib/utils";

export default function Page() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [userLocation, setUserLocation] = useState<{ lat: number | null; lng: number | null }>(() => {
    if (typeof window === "undefined") return { lat: null, lng: null };
    try {
      const saved = localStorage.getItem("day-planner-location");
      return saved ? (JSON.parse(saved) as { lat: number | null; lng: number | null }) : { lat: null, lng: null };
    } catch { return { lat: null, lng: null }; }
  });

  const schedule = useSchedule(selectedDate);
  const { theme, toggleTheme } = useTheme();
  const { view, setView } = useViewPreference();

  function shiftDate(offset: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  const handleScheduleParsed = useCallback(async (parsed: {
    targetDate?: string; dayTitle?: string; dayNote?: string;
    blocks: { blockId: string; start: string; end: string; title: string; note?: string; location: string; priority: string; type: string }[];
  }) => {
    // Use targetDate from agent if provided, otherwise use selectedDate
    const saveDate = parsed.targetDate ?? selectedDate;

    await schedule.upsertSchedule({
      date: saveDate,
      title: parsed.dayTitle ?? "",
      note: parsed.dayNote ?? "",
      blocks: parsed.blocks.map(b => ({ ...b, note: b.note ?? "" })),
    });

    // Navigate to the target date so user sees the schedule
    if (saveDate !== selectedDate) {
      setSelectedDate(saveDate);
    }
  }, [selectedDate, schedule]);

  function requestGeo() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        localStorage.setItem("day-planner-location", JSON.stringify(loc));
      },
    );
  }

  const viewProps = { date: selectedDate, schedule, onShiftDate: shiftDate };
  const chatViewProps = { ...viewProps, location: userLocation, onScheduleParsed: handleScheduleParsed };

  return (
    <>
      {/* Global header — hidden for Zen (has own bar) and Classic (has sidebar) */}
      {view !== "zen" && (
        <header style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 48,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0 16px", background: "var(--bg)", borderBottom: "1px solid var(--border)", zIndex: 40,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {view !== "classic" && <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Day Planner</span>}
            <ViewSwitcher active={view} onChange={setView} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={requestGeo} style={btnStyle}>GPS</button>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <LiveClock />
          </div>
        </header>
      )}

      {/* Active view */}
      {view === "classic" && <ClassicView {...viewProps} />}
      {view === "timeline" && <TimelineView {...viewProps} />}
      {view === "chat" && <ChatView {...chatViewProps} />}
      {view === "zen" && <ZenView {...viewProps} onChangeView={setView} />}
      {view === "dense" && <DenseView {...chatViewProps} />}

      {/* Chat drawer — views with their own chat (chat, dense) don't need it */}
      {view !== "chat" && view !== "dense" && view !== "zen" && (
        <ChatDrawer date={selectedDate} location={userLocation} onScheduleParsed={handleScheduleParsed} />
      )}
    </>
  );
}

const btnStyle: React.CSSProperties = {
  background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)",
  borderRadius: 4, padding: "5px 10px", cursor: "pointer", fontSize: "0.82rem",
  fontWeight: 600, fontFamily: "var(--font-sans)",
};
