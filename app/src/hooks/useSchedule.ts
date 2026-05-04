"use client";
/**
 * T3 CONCEPT: This hook wraps tRPC queries (which are React Query under the hood).
 * `api.schedule.getByDate.useQuery(...)` auto-fetches from the server via tRPC,
 * caches the result, and re-fetches when inputs change. We add derived state
 * (active block, stats) so every view gets the same computed values.
 */
import { api } from "~/trpc/react";
import { timeToDate, blockMinutes } from "~/lib/utils";
import { useMemo } from "react";

export function useSchedule(date: string) {
  const { data: schedule, refetch } = api.schedule.getByDate.useQuery({ date });
  const toggleMutation = api.schedule.toggleBlock.useMutation({ onSuccess: () => void refetch() });
  const upsertMutation = api.schedule.upsert.useMutation({ onSuccess: () => void refetch() });
  const metaMutation = api.schedule.updateMeta.useMutation({ onSuccess: () => void refetch() });
  const updateBlockMutation = api.schedule.updateBlock.useMutation({ onSuccess: () => void refetch() });

  const blocks = schedule?.blocks ?? [];

  const derived = useMemo(() => {
    const now = new Date();
    const active = blocks.find(b => {
      const s = timeToDate(date, b.start);
      const e = timeToDate(date, b.end);
      return now >= s && now < e;
    });
    const nextBlock = blocks.find(b => now < timeToDate(date, b.start));
    const doneCount = blocks.filter(b => b.completed).length;
    const completionPct = blocks.length > 0 ? Math.round((doneCount / blocks.length) * 100) : 0;
    const deskBlocks = blocks.filter(b => b.location === "desk");
    const deskMins = deskBlocks.reduce((sum, b) => sum + blockMinutes(b.start, b.end), 0);
    const mustCount = blocks.filter(b => b.priority === "must").length;
    const prayerCount = blocks.filter(b => b.type === "prayer").length;

    const typeMins: Record<string, number> = {};
    blocks.forEach(b => { typeMins[b.type] = (typeMins[b.type] ?? 0) + blockMinutes(b.start, b.end); });

    return { active, nextBlock, doneCount, completionPct, deskMins, deskBlockCount: deskBlocks.length, mustCount, prayerCount, typeMins };
  }, [blocks, date]);

  return {
    schedule, blocks, refetch,
    ...derived,
    toggleBlock: (id: string) => toggleMutation.mutate({ id }),
    updateBlock: (id: string, fields: Record<string, string>) => updateBlockMutation.mutate({ id, ...fields }),
    upsertSchedule: upsertMutation.mutateAsync,
    updateMeta: metaMutation.mutate,
  };
}
