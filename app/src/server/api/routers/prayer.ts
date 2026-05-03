import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type { PrayerTimes } from "~/lib/types";

const cache = new Map<string, PrayerTimes>();

export const prayerRouter = createTRPCRouter({
  getTimes: publicProcedure
    .input(z.object({
      date: z.string(),
      lat: z.number(),
      lng: z.number(),
    }))
    .query(async ({ input }) => {
      const key = `${input.date}_${input.lat}_${input.lng}`;
      if (cache.has(key)) return cache.get(key)!;

      const [year, month, day] = input.date.split("-");
      const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${input.lat}&longitude=${input.lng}&method=2`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Aladhan API error: ${res.status}`);

      const data = (await res.json()) as { data: { timings: Record<string, string> } };
      const t = data.data.timings;
      const times: PrayerTimes = {
        Fajr: t.Fajr!,
        Sunrise: t.Sunrise!,
        Dhuhr: t.Dhuhr!,
        Asr: t.Asr!,
        Maghrib: t.Maghrib!,
        Isha: t.Isha!,
      };

      cache.set(key, times);
      return times;
    }),
});
